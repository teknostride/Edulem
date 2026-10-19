<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\Tenant;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendWelcomeSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    protected $studentId;
    protected $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $studentId, int $tenantId)
    {
        $this->studentId = $studentId;
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $tenant = Tenant::find($this->tenantId);
            
            if (!$tenant || !$tenant->is_active) {
                return;
            }

            // Tenant'ın SMS gönderim izni var mı kontrol et
            $smsEnabled = DB::table('settings')
                ->where('tenant_id', $this->tenantId)
                ->where('key', 'sms.enabled')
                ->where('value', 'true')
                ->exists();

            if (!$smsEnabled) {
                return;
            }

            $student = Student::where('id', $this->studentId)
                ->where('tenant_id', $this->tenantId)
                ->with('guardians')
                ->first();

            if (!$student) {
                return;
            }

            $guardians = $student->guardians;

            if ($guardians->isEmpty()) {
                return;
            }

            $message = "Sayın Veli, {$student->name} öğrencimiz okulumuza kayıt olmuştur. Hoş geldiniz! Başarılar dileriz.";

            $phones = $guardians->pluck('phone')->filter()->toArray();

            if (!empty($phones)) {
                SendSmsJob::dispatch($phones, $message, $this->tenantId);
            }

            Log::info("Welcome SMS sent for student ID: {$this->studentId}");
        } catch (\Exception $e) {
            Log::error('Welcome SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
