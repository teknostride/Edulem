<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\Tenant;
use App\Models\Installment;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendPaymentReminderSmsJob implements ShouldQueue
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
            $today = now()->toDateString();
            $daysAhead = 3; // 3 gün önceden hatırlat

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

                // Ödeme tarihi yaklaşan taksitleri bul
                $reminderDate = Carbon::parse($today)->addDays($daysAhead)->toDateString();

                $installments = Installment::where('tenant_id', $tenant->id)
                    ->where('status', 'pending')
                    ->where('due_date', '<=', $reminderDate)
                    ->where('due_date', '>=', $today)
                    ->with(['contract.student.guardians'])
                    ->get();

                foreach ($installments as $installment) {
                    $contract = $installment->contract;
                    if (!$contract || !$contract->student) {
                        continue;
                    }

                    $student = $contract->student;
                    $guardians = $student->guardians;

                    if ($guardians->isEmpty()) {
                        continue;
                    }

                    $dueDate = Carbon::parse($installment->due_date)->format('d.m.Y');
                    $amount = number_format($installment->installment_amount, 2, ',', '.');
                    
                    $message = "Sayın Veli, {$student->name} öğrencimiz için ödeme hatırlatması: {$amount} TL tutarındaki taksit {$dueDate} tarihinde sona erecektir.";

                    $phones = $guardians->pluck('phone')->filter()->toArray();

                    if (!empty($phones)) {
                        SendSmsJob::dispatch($phones, $message, $tenant->id);
                    }
                }
            }

            Log::info('Payment reminder SMS job completed successfully.');
        } catch (\Exception $e) {
            Log::error('Payment reminder SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
