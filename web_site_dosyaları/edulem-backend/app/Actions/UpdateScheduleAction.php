<?php

namespace App\Actions;

use App\Models\Schedule;
use App\Services\ActivityLogService;
use App\Services\ScheduleConflictService;
use Illuminate\Support\Facades\DB;

class UpdateScheduleAction
{
    protected ActivityLogService $activityLogService;
    protected ScheduleConflictService $conflictService;

    public function __construct(ActivityLogService $activityLogService, ScheduleConflictService $conflictService)
    {
        $this->activityLogService = $activityLogService;
        $this->conflictService = $conflictService;
    }

    /**
     * Execute the action to update a schedule.
     *
     * @param  \App\Models\Schedule  $schedule
     * @param  array  $scheduleData
     * @return \App\Models\Schedule
     * @throws \Exception
     */
    public function execute(Schedule $schedule, array $scheduleData): Schedule
    {
        return DB::transaction(function () use ($schedule, $scheduleData) {
            // Eski değerleri sakla (activity log için)
            $oldValues = $schedule->getOriginal();

            // Güncellenecek verileri birleştir
            $updateData = array_merge([
                'classroom_id' => $schedule->classroom_id,
                'lesson_id' => $schedule->lesson_id,
                'teacher_id' => $schedule->teacher_id,
                'assistant_teacher_ids' => $schedule->assistant_teacher_ids,
                'day_of_week' => $schedule->day_of_week,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'room' => $schedule->room,
                'remote_link' => $schedule->remote_link,
                'program_type' => $schedule->program_type,
                'program_id' => $schedule->program_id,
            ], $scheduleData);

            // Çakışma kontrolü (kendisini hariç tut)
            $conflictCheck = $this->conflictService->checkConflicts($updateData, $schedule->id);

            if ($conflictCheck['has_conflict']) {
                $conflictMessages = [];
                foreach ($conflictCheck['conflicts'] as $type => $conflict) {
                    $conflictMessages[] = $conflict['message'];
                }
                throw new \Exception('Ders programı çakışması: ' . implode(' ', $conflictMessages));
            }

            $schedule->update([
                'classroom_id' => $updateData['classroom_id'],
                'lesson_id' => $updateData['lesson_id'],
                'teacher_id' => $updateData['teacher_id'],
                'assistant_teacher_ids' => $updateData['assistant_teacher_ids'] ?? $schedule->assistant_teacher_ids,
                'day_of_week' => $updateData['day_of_week'],
                'start_time' => $updateData['start_time'],
                'end_time' => $updateData['end_time'],
                'room' => $updateData['room'] ?? null,
                'remote_link' => $updateData['remote_link'] ?? $schedule->remote_link,
                'program_type' => $updateData['program_type'] ?? $schedule->program_type,
                'program_id' => $updateData['program_id'] ?? $schedule->program_id,
                'notes' => $updateData['notes'] ?? $schedule->notes,
            ]);

            $this->activityLogService->logUpdate($schedule);

            // İlişkileri yükle
            $schedule->load(['classroom', 'lesson', 'teacher', 'tenant']);

            return $schedule;
        });
    }
}
