<?php

namespace App\Jobs;

use App\Jobs\SendSmsJob;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendFirstLessonAbsenceSmsJob implements ShouldQueue
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
            $today = now()->toDateString();
            $dayOfWeek = $this->getDayOfWeek(now()->dayOfWeek);

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

                // Bugünün ilk derslerini bul (en erken başlangıç saatine göre)
                $firstLessons = Schedule::where('tenant_id', $tenant->id)
                    ->where('day_of_week', $dayOfWeek)
                    ->with('lesson')
                    ->orderBy('start_time', 'asc')
                    ->get()
                    ->groupBy(function ($schedule) {
                        return $schedule->classroom_id;
                    })
                    ->map(function ($schedules) {
                        return $schedules->first(); // Her sınıf için ilk dersi al
                    });

                foreach ($firstLessons as $schedule) {
                    // Bu sınıftaki tüm öğrencileri al
                    $students = Student::where('tenant_id', $tenant->id)
                        ->where('classroom_id', $schedule->classroom_id)
                        ->where('is_active', true)
                        ->with('guardians')
                        ->get();

                    foreach ($students as $student) {
                        // Bugün bu ders için yoklama var mı kontrol et
                        $attendance = DB::table('attendances')
                            ->where('tenant_id', $tenant->id)
                            ->where('student_id', $student->id)
                            ->where('schedule_id', $schedule->id)
                            ->where('date', $today)
                            ->first();

                        // Eğer yoklama yoksa veya devamsız ise SMS gönder
                        if (!$attendance || $attendance->status === 'absent') {
                            $guardians = $student->guardians;
                            
                            if ($guardians->isEmpty()) {
                                continue;
                            }

                            $lessonName = $schedule->lesson?->name ?? 'Ders';
                            $formattedDate = now()->format('d.m.Y');
                            $message = "Sayın Veli, {$student->name} öğrencimiz bugün ({$formattedDate}) ilk ders olan {$lessonName} dersinde devamsızdır.";

                            $phones = $guardians->pluck('phone')->filter()->toArray();

                            if (!empty($phones)) {
                                SendSmsJob::dispatch($phones, $message, $tenant->id);
                            }
                        }
                    }
                }
            }

            Log::info('First lesson absence SMS job completed successfully.');
        } catch (\Exception $e) {
            Log::error('First lesson absence SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Convert day of week number to string.
     *
     * @param  int  $dayOfWeek 0 (Sunday) to 6 (Saturday)
     * @return string
     */
    protected function getDayOfWeek(int $dayOfWeek): string
    {
        $days = [
            0 => 'sunday',
            1 => 'monday',
            2 => 'tuesday',
            3 => 'wednesday',
            4 => 'thursday',
            5 => 'friday',
            6 => 'saturday',
        ];

        return $days[$dayOfWeek] ?? 'monday';
    }
}
