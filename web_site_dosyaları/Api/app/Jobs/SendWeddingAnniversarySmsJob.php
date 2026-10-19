<?php

namespace App\Jobs;

use App\Models\Guardian;
use App\Models\User;
use App\Models\Tenant;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendWeddingAnniversarySmsJob implements ShouldQueue
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
            $today = now();
            $day = $today->day;
            $month = $today->month;

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

                // Veli evlilik yıldönümü kutlama
                $guardians = Guardian::whereHas('students', function ($query) use ($tenant) {
                    $query->where('tenant_id', $tenant->id);
                })
                    ->whereNotNull('wedding_anniversary_date')
                    ->whereRaw('DAY(wedding_anniversary_date) = ?', [$day])
                    ->whereRaw('MONTH(wedding_anniversary_date) = ?', [$month])
                    ->get();

                foreach ($guardians as $guardian) {
                    $years = $today->diffInYears($guardian->wedding_anniversary_date);
                    $message = "Sayın {$guardian->name}, evlilik yıldönümünüzü kutlar, mutluluklar dileriz. {$years}. yıl";

                    if ($guardian->phone) {
                        SendSmsJob::dispatch([$guardian->phone], $message, $tenant->id);
                    }
                }

                // Öğretmen evlilik yıldönümü kutlama
                $teachers = User::where('tenant_id', $tenant->id)
                    ->whereNotNull('wedding_anniversary_date')
                    ->whereRaw('DAY(wedding_anniversary_date) = ?', [$day])
                    ->whereRaw('MONTH(wedding_anniversary_date) = ?', [$month])
                    ->get();

                foreach ($teachers as $teacher) {
                    // Öğretmen telefon numarası yoksa atla
                    Log::info("Teacher wedding anniversary: {$teacher->name} (ID: {$teacher->id})");
                }
            }

            Log::info('Wedding anniversary SMS job completed successfully.');
        } catch (\Exception $e) {
            Log::error('Wedding anniversary SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
