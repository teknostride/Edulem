<?php

namespace App\Jobs;

use App\Models\TutoringSession;
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

class SendTutoringSessionReminderSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    public $tries = 3;
    public $backoff = 60;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $tomorrow = Carbon::tomorrow()->toDateString();

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

                // Yarın yapılacak etütleri bul
                $sessions = TutoringSession::where('tenant_id', $tenant->id)
                    ->where('date', $tomorrow)
                    ->where('is_active', true)
                    ->with(['teacher', 'students.guardians', 'lesson'])
                    ->get();

                foreach ($sessions as $session) {
                    // Öğrencilerin velilerine SMS gönder
                    foreach ($session->students as $student) {
                        foreach ($student->guardians as $guardian) {
                            if ($guardian->phone) {
                                $lessonName = $session->lesson?->name ?? 'Etüt';
                                // start_time migration'da time olarak tanımlı, model'de datetime cast var
                                $startTime = $session->start_time instanceof \DateTime 
                                    ? $session->start_time->format('H:i')
                                    : (is_string($session->start_time) ? $session->start_time : Carbon::parse($session->start_time)->format('H:i'));
                                $dateFormatted = Carbon::parse($tomorrow)->format('d.m.Y');
                                $message = "Sayın {$guardian->name}, {$student->name} öğrencimizin yarın ({$dateFormatted}) {$startTime} saatinde {$lessonName} dersi bulunmaktadır. Katılımınızı bekleriz.";

                                try {
                                    SendSmsJob::dispatch(
                                        $guardian->phone,
                                        $message,
                                        $tenant->id
                                    );

                                    Log::info('Etüt hatırlatma SMS gönderildi', [
                                        'guardian_id' => $guardian->id,
                                        'student_id' => $student->id,
                                        'session_id' => $session->id,
                                        'tenant_id' => $tenant->id,
                                    ]);
                                } catch (\Exception $e) {
                                    Log::error('Etüt hatırlatma SMS gönderilemedi', [
                                        'guardian_id' => $guardian->id,
                                        'student_id' => $student->id,
                                        'session_id' => $session->id,
                                        'tenant_id' => $tenant->id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                            }
                        }
                    }
                }

                Log::info('Etüt hatırlatma SMS işlemi tamamlandı', [
                    'tenant_id' => $tenant->id,
                    'total_sessions' => $sessions->count(),
                    'date' => $tomorrow,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Etüt hatırlatma SMS job hatası', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
