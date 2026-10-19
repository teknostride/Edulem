<?php

namespace App\Actions;

use App\Models\Schedule;
use App\Services\ActivityLogService;
use App\Services\ScheduleConflictService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateScheduleAction
{
    protected ActivityLogService $activityLogService;
    protected ScheduleConflictService $conflictService;

    public function __construct(ActivityLogService $activityLogService, ScheduleConflictService $conflictService)
    {
        $this->activityLogService = $activityLogService;
        $this->conflictService = $conflictService;
    }

    /**
     * Execute the action to create a schedule.
     *
     * @param  array  $scheduleData
     * @return \App\Models\Schedule
     * @throws \Exception
     */
    public function execute(array $scheduleData): Schedule
    {
        return DB::transaction(function () use ($scheduleData) {
            // Çakışma kontrolü
            $conflictCheck = $this->conflictService->checkConflicts($scheduleData);

            if ($conflictCheck['has_conflict']) {
                $conflictMessages = [];
                foreach ($conflictCheck['conflicts'] as $type => $conflict) {
                    $conflictMessages[] = $conflict['message'];
                }
                throw new \Exception('Ders programı çakışması: ' . implode(' ', $conflictMessages));
            }

            $schedule = Schedule::create([
                'tenant_id' => Auth::user()->tenant_id,
                'classroom_id' => $scheduleData['classroom_id'],
                'lesson_id' => $scheduleData['lesson_id'],
                'teacher_id' => $scheduleData['teacher_id'] ?? null,
                'assistant_teacher_ids' => $scheduleData['assistant_teacher_ids'] ?? null,
                'day_of_week' => $scheduleData['day_of_week'],
                'start_time' => $scheduleData['start_time'],
                'end_time' => $scheduleData['end_time'],
                'room' => $scheduleData['room'] ?? null,
                'remote_link' => $scheduleData['remote_link'] ?? null,
                'program_type' => $scheduleData['program_type'] ?? 'single',
                'program_id' => $scheduleData['program_id'] ?? null,
                'notes' => $scheduleData['notes'] ?? null,
            ]);

            $this->activityLogService->logCreate($schedule);

            // İlişkileri yükle
            $schedule->load(['classroom', 'lesson', 'teacher', 'tenant']);

            return $schedule;
        });
    }
}
