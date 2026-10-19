<?php

namespace App\Actions;

use App\Models\TutoringSession;
use App\Models\Student;
use App\Services\ActivityLogService;
use App\Services\ScheduleConflictService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreateTutoringSessionAction
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
     * Execute the action to create a tutoring session.
     *
     * @param  array  $sessionData
     * @return \App\Models\TutoringSession
     * @throws \Exception
     */
    public function execute(array $sessionData): TutoringSession
    {
        return DB::transaction(function () use ($sessionData) {
            // Çakışma kontrolü
            if (isset($sessionData['teacher_id']) && isset($sessionData['date']) && isset($sessionData['start_time']) && isset($sessionData['end_time'])) {
                $hasConflict = $this->conflictService->checkTutoringConflict(
                    $sessionData['teacher_id'],
                    $sessionData['date'],
                    $sessionData['start_time'],
                    $sessionData['end_time'],
                    null // Yeni kayıt olduğu için session_id yok
                );

                if ($hasConflict) {
                    throw new \Exception('Öğretmen bu saatte başka bir etüt veya ders programında.');
                }
            }

            // Öğrenci çakışma kontrolü
            if (isset($sessionData['student_ids']) && !empty($sessionData['student_ids'])) {
                $this->checkStudentConflicts($sessionData['student_ids'], $sessionData['date'], $sessionData['start_time'], $sessionData['end_time']);
            }

            // Etüt kaydı oluştur
            $studentIds = $sessionData['student_ids'] ?? [];
            unset($sessionData['student_ids']);

            $session = TutoringSession::create([
                'teacher_id' => $sessionData['teacher_id'],
                'lesson_id' => $sessionData['lesson_id'] ?? null,
                'type' => $sessionData['type'],
                'title' => $sessionData['title'],
                'date' => $sessionData['date'],
                'start_time' => $sessionData['start_time'],
                'end_time' => $sessionData['end_time'],
                'duration' => $sessionData['duration'],
                'room' => $sessionData['room'] ?? null,
                'remote_link' => $sessionData['remote_link'] ?? null,
                'max_students' => $sessionData['max_students'] ?? null,
                'weekly_max_count' => $sessionData['weekly_max_count'] ?? null,
                'homework_id' => $sessionData['homework_id'] ?? null,
                'notes' => $sessionData['notes'] ?? null,
                'is_active' => $sessionData['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Öğrencileri ekle
            if (!empty($studentIds)) {
                $session->students()->attach($studentIds);
            }

            // Activity log
            $this->activityLogService->logCreate($session);

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
     * @return void
     * @throws \Exception
     */
    protected function checkStudentConflicts(array $studentIds, string $date, string $startTime, string $endTime): void
    {
        foreach ($studentIds as $studentId) {
            $conflicts = TutoringSession::whereHas('students', function ($query) use ($studentId) {
                $query->where('students.id', $studentId);
            })
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
