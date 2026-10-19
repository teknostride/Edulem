<?php

namespace App\Actions;

use App\Models\TutoringSession;
use App\Models\Student;
use App\Services\ActivityLogService;
use App\Services\ScheduleConflictService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateTutoringSessionAction
{
    protected ActivityLogService $activityLogService;
    protected ScheduleConflictService $conflictService;

    public function __construct(
        ActivityLogService $activityLogService,
        ScheduleConflictService $conflictService
    ) {
        $this->activityLogService = $activityLogService;
        $this->conflictService = $conflictService;
    }

    /**
     * Execute the action to update a tutoring session.
     *
     * @param  \App\Models\TutoringSession  $session
     * @param  array  $sessionData
     * @return \App\Models\TutoringSession
     * @throws \Exception
     */
    public function execute(TutoringSession $session, array $sessionData): TutoringSession
    {
        return DB::transaction(function () use ($session, $sessionData) {
            // Çakışma kontrolü (eğer tarih/saat değiştiyse)
            if (isset($sessionData['teacher_id']) || isset($sessionData['date']) || isset($sessionData['start_time']) || isset($sessionData['end_time'])) {
                $teacherId = $sessionData['teacher_id'] ?? $session->teacher_id;
                $date = $sessionData['date'] ?? $session->date;
                $startTime = $sessionData['start_time'] ?? $session->start_time;
                $endTime = $sessionData['end_time'] ?? $session->end_time;

                $hasConflict = $this->conflictService->checkTutoringConflict(
                    $teacherId,
                    $date,
                    $startTime,
                    $endTime,
                    $session->id
                );

                if ($hasConflict) {
                    throw new \Exception('Öğretmen bu saatte başka bir etüt veya ders programında.');
                }
            }

            // Öğrenci çakışma kontrolü
            if (isset($sessionData['student_ids'])) {
                $date = $sessionData['date'] ?? $session->date;
                $startTime = $sessionData['start_time'] ?? $session->start_time;
                $endTime = $sessionData['end_time'] ?? $session->end_time;

                $this->checkStudentConflicts($sessionData['student_ids'], $date, $startTime, $endTime, $session->id);
            }

            // Öğrenci listesini güncelle
            $studentIds = $sessionData['student_ids'] ?? null;
            if (isset($studentIds)) {
                unset($sessionData['student_ids']);
                $session->students()->sync($studentIds);
            }

            // Etüt bilgilerini güncelle
            $session->update($sessionData);

            // Activity log
            $this->activityLogService->logUpdate($session);

            // İlişkileri yükle
            $session->load(['teacher', 'lesson', 'homework', 'students', 'creator']);

            return $session;
        });
    }

    /**
     * Check student conflicts.
     *
     * @param  array  $studentIds
     * @param  string  $date
     * @param  string  $startTime
     * @param  string  $endTime
     * @param  int  $excludeSessionId
     * @return void
     * @throws \Exception
     */
    protected function checkStudentConflicts(array $studentIds, string $date, string $startTime, string $endTime, int $excludeSessionId): void
    {
        foreach ($studentIds as $studentId) {
            $conflicts = TutoringSession::whereHas('students', function ($query) use ($studentId) {
                $query->where('students.id', $studentId);
            })
                ->where('id', '!=', $excludeSessionId)
                ->where('date', $date)
                ->where('is_active', true)
                ->where(function ($query) use ($startTime, $endTime) {
                    $query->whereBetween('start_time', [$startTime, $endTime])
                        ->orWhereBetween('end_time', [$startTime, $endTime])
                        ->orWhere(function ($q) use ($startTime, $endTime) {
                            $q->where('start_time', '<=', $startTime)
                                ->where('end_time', '>=', $endTime);
                        });
                })
                ->exists();

            if ($conflicts) {
                $student = \App\Models\Student::find($studentId);
                throw new \Exception("{$student->name} öğrencisi bu saatte başka bir etüte kayıtlı.");
            }
        }
    }
}
