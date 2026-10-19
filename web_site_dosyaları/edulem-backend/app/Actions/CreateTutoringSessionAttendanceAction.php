<?php

namespace App\Actions;

use App\Models\TutoringSession;
use App\Models\TutoringSessionAttendance;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateTutoringSessionAttendanceAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create tutoring session attendance.
     *
     * @param  \App\Models\TutoringSession  $session
     * @param  array  $attendanceData
     * @return \App\Models\TutoringSessionAttendance
     * @throws \Exception
     */
    public function execute(TutoringSession $session, array $attendanceData): TutoringSessionAttendance
    {
        return DB::transaction(function () use ($session, $attendanceData) {
            // Öğrenci etüte kayıtlı mı kontrol et
            if (!$session->students()->where('students.id', $attendanceData['student_id'])->exists()) {
                throw new \Exception('Öğrenci bu etüte kayıtlı değil.');
            }

            // Daha önce yoklama alınmış mı kontrol et
            $existing = TutoringSessionAttendance::where('tutoring_session_id', $session->id)
                ->where('student_id', $attendanceData['student_id'])
                ->first();

            if ($existing) {
                // Güncelle
                $existing->update([
                    'status' => $attendanceData['status'],
                    'notes' => $attendanceData['notes'] ?? null,
                ]);

                $this->activityLogService->logUpdate($existing);
                return $existing;
            }

            // Yeni yoklama kaydı oluştur
            $attendance = TutoringSessionAttendance::create([
                'tenant_id' => $session->tenant_id,
                'tutoring_session_id' => $session->id,
                'student_id' => $attendanceData['student_id'],
                'status' => $attendanceData['status'],
                'notes' => $attendanceData['notes'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($attendance);

            // İlişkileri yükle
            $attendance->load(['student', 'tutoringSession', 'creator']);

            return $attendance;
        });
    }
}
