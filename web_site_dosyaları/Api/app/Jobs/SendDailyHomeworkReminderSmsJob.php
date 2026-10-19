<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\Tenant;
use App\Models\Homework;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendDailyHomeworkReminderSmsJob implements ShouldQueue
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
            $tomorrow = now()->addDay()->toDateString();

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

                // Bugün verilen veya yarın teslim edilecek ödevleri bul
                $homeworks = Homework::where('tenant_id', $tenant->id)
                    ->where(function ($query) use ($today, $tomorrow) {
                        $query->where('assigned_date', $today)
                            ->orWhere('due_date', $tomorrow);
                    })
                    ->with(['classroom.students.guardians', 'lesson'])
                    ->get();

                foreach ($homeworks as $homework) {
                    $classroom = $homework->classroom;
                    if (!$classroom) {
                        continue;
                    }

                    $students = $classroom->students()->where('is_active', true)->get();
                    $lessonName = $homework->lesson?->name ?? 'Ders';

                    foreach ($students as $student) {
                        $guardians = $student->guardians;
                        
                        if ($guardians->isEmpty()) {
                            continue;
                        }

                        $dueDate = Carbon::parse($homework->due_date)->format('d.m.Y');
                        $message = "Sayın Veli, {$student->name} öğrencimiz için {$lessonName} dersinden ödev verilmiştir. Teslim tarihi: {$dueDate}";

                        $phones = $guardians->pluck('phone')->filter()->toArray();

                        if (!empty($phones)) {
                            SendSmsJob::dispatch($phones, $message, $tenant->id);
                        }
                    }
                }
            }

            Log::info('Daily homework reminder SMS job completed successfully.');
        } catch (\Exception $e) {
            Log::error('Daily homework reminder SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
