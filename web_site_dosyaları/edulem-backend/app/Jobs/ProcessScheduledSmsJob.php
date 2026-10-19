<?php

namespace App\Jobs;

use App\Models\ScheduledSms;
use App\Jobs\SendSmsJob;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ProcessScheduledSmsJob implements ShouldQueue
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
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        try {
            // Gönderilmeye hazır planlı SMS'leri al (Türkiye saati Europe/Istanbul baz alınır)
            $nowTurkey = Carbon::now('Europe/Istanbul')->format('Y-m-d H:i:s');
            $scheduledSmsList = ScheduledSms::whereIn('status', ['pending', 'processing'])
                ->where('scheduled_at', '<=', $nowTurkey)
                ->get();

            foreach ($scheduledSmsList as $scheduledSms) {
                try {
                    $scheduledSms->markAsProcessing();

                    // Alıcı telefon numaralarını çöz
                    $phones = $this->resolveRecipients($scheduledSms);

                    Log::info('ProcessScheduledSmsJob: alıcılar çözüldü', [
                        'id'     => $scheduledSms->id,
                        'type'   => $scheduledSms->recipient_type,
                        'phones' => $phones,
                    ]);

                    if (empty($phones)) {
                        $scheduledSms->markAsFailed('Alıcı telefon numarası bulunamadı.');
                        continue;
                    }

                    // Numaraları geçerli ve geçersiz olarak ayrıştır
                    $validPhones = [];
                    $invalidPhones = [];

                    foreach ($phones as $phoneStr) {
                        $normalized = ScheduledSms::validateAndNormalizePhone($phoneStr);
                        if ($normalized !== null) {
                            $validPhones[$normalized] = $normalized;
                        } else {
                            $invalidPhones[$phoneStr] = $phoneStr;
                        }
                    }

                    // Geçersiz numaraları hemen hata olarak kaydet
                    foreach ($invalidPhones as $invPhone) {
                        \App\Models\SmsReport::create([
                            'tenant_id'     => $scheduledSms->tenant_id,
                            'phone'         => (string) $invPhone,
                            'message'       => $scheduledSms->message,
                            'status'        => 'failed',
                            'error_code'    => 'INVALID_NUMBER_FORMAT',
                            'error_message' => 'Geçersiz telefon numarası formatı (05XXXXXXXXX veya 905XXXXXXXXX olmalı)',
                            'sent_at'       => null,
                            'sender_type'   => 'scheduled_sms',
                            'sender_id'     => $scheduledSms->id,
                            'created_by'    => $scheduledSms->created_by,
                        ]);
                    }

                    $validPhoneList = array_values($validPhones);
                    $sentCount = 0;
                    $failedCount = count($invalidPhones);

                    if (!empty($validPhoneList)) {
                        // SMS servisini al ve doğrudan gönder
                        $smsService = $this->getSmsServiceForTenant($scheduledSms->tenant_id);
                        $result     = $smsService->send($validPhoneList, $scheduledSms->message, $scheduledSms->title);

                        // SmsReport kayıtları
                        foreach ($validPhoneList as $phone) {
                            \App\Models\SmsReport::create([
                                'tenant_id'     => $scheduledSms->tenant_id,
                                'phone'         => $phone,
                                'message'       => $scheduledSms->message,
                                'status'        => $result['success'] ? 'sent' : 'failed',
                                'message_id'    => $result['message_id'] ?? null,
                                'error_code'    => $result['error_code'] ?? null,
                                'error_message' => $result['success'] ? null : ($result['message'] ?? 'SMS gönderilemedi'),
                                'sent_at'       => $result['success'] ? now() : null,
                                'sender_type'   => 'scheduled_sms',
                                'sender_id'     => $scheduledSms->id,
                                'created_by'    => $scheduledSms->created_by,
                            ]);
                        }

                        if ($result['success']) {
                            $sentCount += count($validPhoneList);
                        } else {
                            $failedCount += count($validPhoneList);
                        }
                    }

                    if ($sentCount > 0 && $failedCount === 0) {
                        $scheduledSms->markAsSent($sentCount, 0);
                    } elseif ($sentCount > 0 && $failedCount > 0) {
                        $scheduledSms->update([
                            'status'       => 'completed',
                            'sent_at'      => now(),
                            'sent_count'   => $sentCount,
                            'failed_count' => $failedCount,
                        ]);
                    } else {
                        $scheduledSms->markAsFailed($failedCount > 0 ? "{$failedCount} alıcıya SMS iletilemedi." : 'SMS gönderilemedi.');
                        $scheduledSms->update(['sent_count' => 0, 'failed_count' => $failedCount]);
                    }

                } catch (\Exception $e) {
                    $scheduledSms->markAsFailed($e->getMessage());
                    Log::error('Planlı SMS işleme hatası', [
                        'scheduled_sms_id' => $scheduledSms->id,
                        'error'            => $e->getMessage(),
                        'trace'            => $e->getTraceAsString(),
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('ProcessScheduledSmsJob genel hatası', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Tenant ayarlarına göre SMS servisi oluştur.
     */
    protected function getSmsServiceForTenant(?int $tenantId): \App\Contracts\SmsServiceInterface
    {
        $settings = [];
        if ($tenantId) {
            $settings = DB::table('settings')
                ->where('tenant_id', $tenantId)
                ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url', 'sms_driver'])
                ->pluck('value', 'key')
                ->toArray();
        }

        if (empty($settings['iletibilgi_username']) && (int)$tenantId === 1) {
            $fallbackSettings = DB::table('settings')
                ->whereNull('tenant_id')
                ->whereIn('key', ['iletibilgi_username', 'iletibilgi_password', 'iletibilgi_sender', 'iletibilgi_base_url', 'sms_driver'])
                ->whereNotNull('value')
                ->where('value', '!=', '')
                ->pluck('value', 'key')
                ->toArray();
            $settings = array_merge($fallbackSettings, array_filter($settings));
        }

        $driver  = $settings['sms_driver'] ?? config('sms.driver', 'iletibilgi');
        $username = $settings['iletibilgi_username'] ?? '';
        $password = $settings['iletibilgi_password'] ?? '';
        $sender   = $settings['iletibilgi_sender']   ?? ((int)$tenantId === 1 ? 'AK IRFAN' : '');
        $baseUrl  = $settings['iletibilgi_base_url'] ?? 'https://panel.iletibilgi.com.tr:9588';

        return new \App\Services\IletibilgiService($username, $password, $sender, $baseUrl);
    }

    /**
     * Resolve recipient phone numbers.
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function resolveRecipients(ScheduledSms $scheduledSms): array
    {
        return match ($scheduledSms->recipient_type) {
            'phones' => $this->normalizePhones($scheduledSms->recipient_phones ?? []),
            'students' => $this->getStudentPhones($scheduledSms),
            'guardians' => $this->getGuardianPhones($scheduledSms),
            'users' => $this->getUserPhones($scheduledSms),
            'classroom' => $this->getClassroomPhones($scheduledSms),
            'all' => $this->getAllPhones($scheduledSms),
            default => [],
        };
    }

    /**
     * Telefon numaralarını 90XXXXXXXXXX formatına normalize et.
     */
    protected function normalizePhones(array $phones): array
    {
        $result = [];
        foreach ($phones as $phone) {
            $cleaned = preg_replace('/[^0-9]/', '', $phone);
            if (strlen($cleaned) === 10) {
                // 5XXXXXXXXX -> 905XXXXXXXXX
                $cleaned = '90' . $cleaned;
            } elseif (strlen($cleaned) === 11 && str_starts_with($cleaned, '0')) {
                // 05XXXXXXXXX -> 905XXXXXXXXX
                $cleaned = '9' . $cleaned;
            }
            if (strlen($cleaned) >= 10) {
                $result[] = $cleaned;
            }
        }
        return array_values(array_unique($result));
    }

    /**
     * Get student phone numbers.
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function getStudentPhones(ScheduledSms $scheduledSms): array
    {
        $studentIds = $scheduledSms->recipient_ids ?? [];
        $phones = [];
        $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)
            ->whereIn('id', $studentIds)
            ->with('guardians')
            ->get();

        foreach ($students as $student) {
            if (!empty($student->phone)) {
                $phones[] = $student->phone;
            }
            foreach ($student->guardians as $guardian) {
                if (!empty($guardian->phone)) {
                    $phones[] = $guardian->phone;
                }
            }
        }

        return array_values(array_unique(array_filter($phones)));
    }

    /**
     * Get guardian phone numbers.
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function getGuardianPhones(ScheduledSms $scheduledSms): array
    {
        $guardianIds = $scheduledSms->recipient_ids ?? [];
        
        return \App\Models\Guardian::whereIn('id', $guardianIds)
            ->whereNotNull('phone')
            ->pluck('phone')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Get user phone numbers.
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function getUserPhones(ScheduledSms $scheduledSms): array
    {
        $userIds = $scheduledSms->recipient_ids ?? [];
        
        return \App\Models\User::where('tenant_id', $scheduledSms->tenant_id)
            ->whereIn('id', $userIds)
            ->whereNotNull('phone')
            ->pluck('phone')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Get classroom phone numbers.
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function getClassroomPhones(ScheduledSms $scheduledSms): array
    {
        $classroomIds = $scheduledSms->recipient_ids ?? [];
        $phones = [];
        $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)
            ->whereIn('classroom_id', $classroomIds)
            ->with('guardians')
            ->get();

        foreach ($students as $student) {
            if (!empty($student->phone)) {
                $phones[] = $student->phone;
            }
            foreach ($student->guardians as $guardian) {
                if (!empty($guardian->phone)) {
                    $phones[] = $guardian->phone;
                }
            }
        }

        return array_values(array_unique(array_filter($phones)));
    }

    /**
     * Get all phone numbers (all guardians & students in tenant).
     *
     * @param  ScheduledSms  $scheduledSms
     * @return array
     */
    protected function getAllPhones(ScheduledSms $scheduledSms): array
    {
        $phones = [];
        $students = \App\Models\Student::where('tenant_id', $scheduledSms->tenant_id)
            ->with('guardians')
            ->get();

        foreach ($students as $student) {
            if (!empty($student->phone)) {
                $phones[] = $student->phone;
            }
            foreach ($student->guardians as $guardian) {
                if (!empty($guardian->phone)) {
                    $phones[] = $guardian->phone;
                }
            }
        }

        return array_values(array_unique(array_filter($phones)));
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessScheduledSmsJob kalıcı olarak başarısız oldu', [
            'error' => $exception->getMessage(),
        ]);
    }
}
