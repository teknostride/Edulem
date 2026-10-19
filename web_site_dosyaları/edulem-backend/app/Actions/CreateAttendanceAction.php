<?php

namespace App\Actions;

use App\Jobs\SendSmsJob;
use App\Models\Attendance;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAttendanceAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an attendance record.
     *
     * @param  array  $attendanceData
     * @return \App\Models\Attendance
     * @throws \Exception
     */
    public function execute(array $attendanceData): Attendance
    {
        return DB::transaction(function () use ($attendanceData) {
            $attendance = Attendance::create([
                'tenant_id' => Auth::user()->tenant_id,
                'student_id' => $attendanceData['student_id'],
                'schedule_id' => $attendanceData['schedule_id'] ?? null,
                'teacher_id' => Auth::id(),
                'date' => $attendanceData['date'],
                'status' => $attendanceData['status'],
                'is_administrative_leave' => $attendanceData['is_administrative_leave'] ?? false,
                'administrative_leave_reason' => $attendanceData['administrative_leave_reason'] ?? null,
                'notes' => $attendanceData['notes'] ?? null,
            ]);

            $this->activityLogService->logCreate($attendance);

            // Devamsızlık durumunda SMS gönder (kurucu kontrolü ile)
            if ($attendance->status === 'absent') {
                $this->sendAbsenceSms($attendance);
            }

            // İlişkileri yükle
            $attendance->load(['student', 'schedule' => function ($q) {
                $q->with('lesson');
            }, 'teacher', 'tenant']);

            return $attendance;
        });
    }

    /**
     * Send SMS to guardians when student is absent.
     *
     * @param  \App\Models\Attendance  $attendance
     * @return void
     */
    protected function sendAbsenceSms(Attendance $attendance): void
    {
        $student = $attendance->student()->with('guardians')->first();
        $guardians = $student->guardians;

        if ($guardians->isEmpty()) {
            return;
        }

        // SMS mesajı oluştur
        $lessonName = $attendance->schedule?->lesson?->name ?? 'Ders';
        $message = "Sayın Veli, {$student->name} öğrencimiz {$attendance->date->format('d.m.Y')} tarihinde {$lessonName} dersinde devamsızdır.";

        // Velilerin telefon numaralarını topla
        $phones = $guardians->pluck('phone')->filter()->toArray();

        if (empty($phones)) {
            return;
        }

        // SMS gönder (kurucu kontrolü SendSmsJob içinde yapılacak)
        SendSmsJob::dispatch($phones, $message, $attendance->tenant_id);
    }
}
