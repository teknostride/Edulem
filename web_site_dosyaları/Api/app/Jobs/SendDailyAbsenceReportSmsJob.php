<?php

namespace App\Jobs;

use App\Models\Student;
use App\Models\Tenant;
use App\Models\Attendance;
use App\Jobs\SendSmsJob;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendDailyAbsenceReportSmsJob implements ShouldQueue
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

                // Bugün devamsız olan öğrencileri bul
                $absentStudents = Student::where('tenant_id', $tenant->id)
                    ->where('is_active', true)
                    ->whereHas('attendances', function ($query) use ($today) {
                        $query->where('date', $today)
                            ->where('status', 'absent');
                    })
                    ->with(['guardians', 'attendances' => function ($query) use ($today) {
                        $query->where('date', $today)
                            ->where('status', 'absent');
                    }])
                    ->get();

                // Her veli için çocuklarının devamsızlık raporunu gönder
                $guardianReports = [];

                foreach ($absentStudents as $student) {
                    $guardians = $student->guardians;
                    $absentCount = $student->attendances->count();

                    foreach ($guardians as $guardian) {
                        if (!$guardian->phone) {
                            continue;
                        }

                        if (!isset($guardianReports[$guardian->phone])) {
                            $guardianReports[$guardian->phone] = [
                                'guardian' => $guardian,
                                'students' => [],
                            ];
                        }

                        $guardianReports[$guardian->phone]['students'][] = [
                            'name' => $student->name,
                            'count' => $absentCount,
                        ];
                    }
                }

                // Her veliye SMS gönder
                foreach ($guardianReports as $phone => $report) {
                    $studentNames = collect($report['students'])->pluck('name')->join(', ');
                    $totalAbsent = collect($report['students'])->sum('count');
                    
                    $message = "Sayın {$report['guardian']->name}, bugün ({$today}) çocuklarınızdan {$studentNames} toplam {$totalAbsent} ders devamsızdır.";

                    SendSmsJob::dispatch([$phone], $message, $tenant->id);
                }
            }

            Log::info('Daily absence report SMS job completed successfully.');
        } catch (\Exception $e) {
            Log::error('Daily absence report SMS job failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
