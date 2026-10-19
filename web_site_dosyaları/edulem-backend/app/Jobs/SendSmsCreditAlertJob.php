<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\SmsService;
use App\Contracts\SmsServiceInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendSmsCreditAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Tüm aktif tenant'ları al
            $tenants = Tenant::where('is_active', true)->get();

            foreach ($tenants as $tenant) {
                // Tenant'ın SMS gönderim izni var mı kontrol et
                $smsEnabled = DB::table('settings')
                    ->where('tenant_id', $tenant->id)
                    ->where('key', 'sms.enabled')
                    ->where('value', 'true')
                    ->exists();

                if (!$smsEnabled) {
                    continue;
                }

                // Kritik limit ayarını al (varsayılan: 100 SMS)
                $criticalLimit = DB::table('settings')
                    ->where('tenant_id', $tenant->id)
                    ->where('key', 'sms.critical_limit')
                    ->value('value');

                $criticalLimit = $criticalLimit ? (int) $criticalLimit : 100;

                // SMS servisinden kalan kontörü kontrol et
                $smsService = app(SmsServiceInterface::class);
                
                try {
                    // NetgsmService'de getCredit metodu yoksa, manuel kontrol yapılabilir
                    // Şimdilik settings'ten kontrol edelim
                    $currentCredit = DB::table('settings')
                        ->where('tenant_id', $tenant->id)
                        ->where('key', 'sms.current_credit')
                        ->value('value');

                    $currentCredit = $currentCredit ? (int) $currentCredit : null;

                    if ($currentCredit !== null && $currentCredit <= $criticalLimit) {
                        // SuperAdmin veya kurucuya uyarı gönder
                        $superAdmins = DB::table('users')
                            ->where('tenant_id', $tenant->id)
                            ->where('is_superadmin', true)
                            ->get();

                        foreach ($superAdmins as $admin) {
                            // Admin telefon numarası yoksa email kullanılabilir
                            // Şimdilik sadece loglama yapıyoruz
                            Log::warning("SMS credit alert for tenant {$tenant->id}: Current credit: {$currentCredit}, Critical limit: {$criticalLimit}");
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("SMS credit check failed for tenant {$tenant->id}: " . $e->getMessage());
                }
            }

            Log::info('SMS credit alert job completed successfully.');
        } catch (\Exception $e) {
            Log::error('SMS credit alert job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
