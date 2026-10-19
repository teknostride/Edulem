<?php

namespace App\Actions;

use App\Jobs\SendSmsJob;
use App\Models\Attendance;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateAttendanceAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update an attendance record.
     *
     * @param  \App\Models\Attendance  $attendance
     * @param  array  $attendanceData
     * @return \App\Models\Attendance
     * @throws \Exception
     */
    public function execute(Attendance $attendance, array $attendanceData): Attendance
    {
        return DB::transaction(function () use ($attendance, $attendanceData) {
            // Eski durumu sakla
            $oldStatus = $attendance->status;

            $attendance->update([
                'status' => $attendanceData['status'] ?? $attendance->status,
                'is_administrative_leave' => $attendanceData['is_administrative_leave'] ?? $attendance->is_administrative_leave,
                'administrative_leave_reason' => $attendanceData['administrative_leave_reason'] ?? $attendance->administrative_leave_reason,
                'notes' => $attendanceData['notes'] ?? $attendance->notes,
            ]);

            $this->activityLogService->logUpdate($attendance);

            // Eğer durum 'absent' olarak değiştirildiyse SMS gönder
            if ($oldStatus !== 'absent' && $attendance->status === 'absent') {
                $this->sendAbsenceSms($attendance);
            }

            // İlişkileri yükle
            $attendance->load(['student', 'schedule', 'teacher', 'tenant']);

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
