<?php

namespace App\Jobs;

use App\Contracts\SmsServiceInterface;
use App\Services\IletibilgiService;
use App\Services\NetgsmService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * Phone numbers to send SMS to.
     *
     * @var string|array
     */
    protected string|array $phones;

    /**
     * SMS message content.
     *
     * @var string
     */
    protected string $message;

    /**
     * Tenant ID for SMS notification control.
     *
     * @var int|null
     */
    protected ?int $tenantId;

    /**
     * Sender type for reporting (e.g. manual, birthday_staff, birthday_student).
     *
     * @var string|null
     */
    protected ?string $senderType;

    /**
     * Sender reference ID (e.g. user ID, student ID).
     *
     * @var int|null
     */
    protected ?int $senderId;

    /**
     * Create a new job instance.
     *
     * @param  string|array  $phones
     * @param  string  $message
     * @param  int|null  $tenantId
     * @param  string|null  $senderType
     * @param  int|null  $senderId
     */
    public function __construct(string|array $phones, string $message, ?int $tenantId = null, ?string $senderType = 'manual', ?int $senderId = null)
    {
        $this->phones = $phones;
        $this->message = $message;
        $this->tenantId = $tenantId;
        $this->senderType = $senderType;
        $this->senderId = $senderId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        try {
            // Kurucu kontrolü: Eğer tenant_id varsa ve SMS bildirimleri kapalıysa, SMS gönderme
            if ($this->tenantId !== null) {
                $tenant = \App\Models\Tenant::find($this->tenantId);
                
                if ($tenant && !$tenant->isSmsNotificationEnabled()) {
                    Log::info('SMS gönderimi atlandı - Kurucu SMS bildirimlerini kapalı tutmuş', [
                        'tenant_id' => $this->tenantId,
                        'tenant_name' => $tenant->name,
                        'phones' => $this->phones,
                    ]);
                    
                    // SMS gönderilmedi ama job başarılı sayılır (hata değil)
                    return;
                }

                // Kara liste kontrolü (RED seçeneği)
                $phones = is_array($this->phones) ? $this->phones : [$this->phones];
                $filteredPhones = [];
                
                foreach ($phones as $phone) {
                    if (!\App\Models\SmsBlacklist::isBlacklisted($phone, $this->tenantId)) {
                        $filteredPhones[] = $phone;
                    } else {
                        Log::info('SMS gönderimi atlandı - Telefon kara listede', [
                            'tenant_id' => $this->tenantId,
                            'phone' => $phone,
                        ]);
                    }
                }

                // Eğer tüm telefonlar kara listedeyse, job'ı başarılı say (hata değil)
                if (empty($filteredPhones)) {
                    return;
                }

                // Filtrelenmiş telefonlarla devam et
                $this->phones = count($filteredPhones) === 1 ? $filteredPhones[0] : $filteredPhones;
            }

            $smsService = $this->getSmsService();

            $result = $smsService->send($this->phones, $this->message);

            // SMS raporlarını kaydet
            $phones = is_array($this->phones) ? $this->phones : [$this->phones];

            foreach ($phones as $phone) {
                \App\Models\SmsReport::create([
                    'tenant_id' => $this->tenantId,
                    'phone' => $phone,
                    'message' => $this->message,
                    'status' => $result['success'] ? 'sent' : 'failed',
                    'message_id' => $result['message_id'] ?? null,
                    'error_code' => $result['error_code'] ?? null,
                    'error_message' => $result['success'] ? null : ($result['message'] ?? null),
                    'sent_at' => $result['success'] ? now() : null,
                    'sender_type' => $this->senderType ?? 'manual',
                    'sender_id' => $this->senderId ?? null,
                    'created_by' => null, // Job içinde user context yok, sender_id ile takip edilebilir
                ]);
            }

            if (!$result['success']) {
                Log::error('SMS gönderim başarısız', [
                    'phones' => $this->phones,
                    'error' => $result['message'],
                ]);

                // Hata durumunda job'ı fail et
                throw new \Exception($result['message']);
            }

            Log::info('SMS başarıyla gönderildi', [
                'phones' => $this->phones,
                'tenant_id' => $this->tenantId,
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('SMS Job hatası', [
                'phones' => $this->phones,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Get the SMS service instance based on database settings.
     *
     * @return SmsServiceInterface
     */
    protected function getSmsService(): SmsServiceInterface
    {
        $driver = config('sms.driver', 'iletibilgi');
        if ($this->tenantId) {
            $dbDriver = \Illuminate\Support\Facades\DB::table('settings')
                ->where('tenant_id', $this->tenantId)
                ->where('key', 'sms_driver')
                ->value('value');
            if ($dbDriver) {
                $driver = $dbDriver;
            }
        }

        return match ($driver) {
            'netgsm' => $this->createNetgsmService(),
            'iletibilgi' => $this->createIletibilgiService(),
            default => $this->createIletibilgiService(),
        };
    }

    /**
     * Create Iletibilgi service instance.
     *
     * @return IletibilgiService
     */
    protected function createIletibilgiService(): IletibilgiService
    {
        $settings = [];
        if ($this->tenantId) {
            $settings = \Illuminate\Support\Facades\DB::table('settings')
                ->where('tenant_id', $this->tenantId)
                ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url'])
                ->pluck('value', 'key')
                ->toArray();
        }

        $username = $settings['iletibilgi_username'] ?? config('sms.iletibilgi.username') ?? config('sms.username', '');
        $password = $settings['iletibilgi_password'] ?? config('sms.iletibilgi.password') ?? config('sms.password', '');
        $sender = $settings['iletibilgi_sender'] ?? config('sms.iletibilgi.sender') ?? config('sms.sender', 'AK IRFAN');
        $baseUrl = $settings['iletibilgi_base_url'] ?? config('sms.iletibilgi.base_url') ?? 'https://panel.iletibilgi.com.tr:9588';

        return new IletibilgiService($username, $password, $sender, $baseUrl);
    }

    /**
     * Create NetGSM service instance.
     *
     * @return NetgsmService
     */
    protected function createNetgsmService(): NetgsmService
    {
        $username = config('sms.netgsm.username');
        $password = config('sms.netgsm.password');
        $msgheader = config('sms.netgsm.msgheader');

        if (empty($username) || empty($password) || empty($msgheader)) {
            throw new \Exception('NetGSM ayarları eksik. Lütfen SMS ayarlarını kontrol edin.');
        }

        return new NetgsmService($username, $password, $msgheader);
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SMS Job kalıcı olarak başarısız oldu', [
            'phones' => $this->phones,
            'message' => $this->message,
            'error' => $exception->getMessage(),
        ]);
    }
}
