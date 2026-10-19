<?php

namespace App\Jobs;

use App\Models\OnlineExamAttempt;
use App\Models\Tenant;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendOnlineExamResultSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public OnlineExamAttempt $attempt
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $attempt = $this->attempt->load(['student.guardians', 'onlineExam']);
            $student = $attempt->student;
            $exam = $attempt->onlineExam;

            // Tenant'ın SMS gönderim izni var mı kontrol et
            $smsEnabled = DB::table('settings')
                ->where('tenant_id', $student->tenant_id)
                ->where('key', 'sms.enabled')
                ->where('value', 'true')
                ->exists();

            if (!$smsEnabled) {
                return;
            }

            // Velilere SMS gönder
            foreach ($student->guardians as $guardian) {
                if ($guardian->phone) {
                    $message = "Sayın {$guardian->name}, {$student->name} öğrencimizin {$exam->title} sınavı sonuçlandı. Puan: {$attempt->score}/{$exam->total_points} (%{$attempt->percentage}).";

                    try {
                        SendSmsJob::dispatch(
                            $guardian->phone,
                            $message,
                            $student->tenant_id
                        );

                        Log::info('Online sınav sonuç SMS gönderildi', [
                            'guardian_id' => $guardian->id,
                            'student_id' => $student->id,
                            'attempt_id' => $attempt->id,
                            'tenant_id' => $student->tenant_id,
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Online sınav sonuç SMS gönderilemedi', [
                            'guardian_id' => $guardian->id,
                            'student_id' => $student->id,
                            'attempt_id' => $attempt->id,
                            'tenant_id' => $student->tenant_id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Online sınav sonuç SMS job hatası', [
                'attempt_id' => $this->attempt->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
