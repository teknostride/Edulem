<?php

namespace App\Actions;

use App\Models\DutySchedule;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateDutyScheduleAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a duty schedule.
     *
     * @param  array  $dutyScheduleData
     * @return \App\Models\DutySchedule
     * @throws \Exception
     */
    public function execute(array $dutyScheduleData): DutySchedule
    {
        return DB::transaction(function () use ($dutyScheduleData) {
            // Çakışma kontrolü
            $conflicts = DutySchedule::where('tenant_id', Auth::user()->tenant_id)
                ->where('user_id', $dutyScheduleData['user_id'])
                ->where('day_of_week', $dutyScheduleData['day_of_week'])
                ->when(array_key_exists('campus_id', $dutyScheduleData) && $dutyScheduleData['campus_id'] !== null, fn ($q) => $q->where('campus_id', (int) $dutyScheduleData['campus_id']))
                ->when(array_key_exists('education_level_id', $dutyScheduleData) && $dutyScheduleData['education_level_id'] !== null, fn ($q) => $q->where('education_level_id', (int) $dutyScheduleData['education_level_id']))
                ->where('is_active', true)
                ->get()
                ->filter(function ($existing) use ($dutyScheduleData) {
                    $newStart = strtotime($dutyScheduleData['start_time']);
                    $newEnd = strtotime($dutyScheduleData['end_time']);
                    $existingStart = strtotime($existing->start_time);
                    $existingEnd = strtotime($existing->end_time);
                    
                    return !($newEnd <= $existingStart || $newStart >= $existingEnd);
                });

            if ($conflicts->isNotEmpty()) {
                throw new \Exception('Bu personel için aynı gün ve saatte zaten bir nöbet programı bulunmaktadır.');
            }

            $dutySchedule = DutySchedule::create([
                'tenant_id' => Auth::user()->tenant_id,
                'user_id' => $dutyScheduleData['user_id'],
                'campus_id' => $dutyScheduleData['campus_id'] ?? null,
                'education_level_id' => $dutyScheduleData['education_level_id'] ?? null,
                'day_of_week' => $dutyScheduleData['day_of_week'],
                'start_time' => $dutyScheduleData['start_time'],
                'end_time' => $dutyScheduleData['end_time'],
                'location' => $dutyScheduleData['location'] ?? null,
                'notes' => $dutyScheduleData['notes'] ?? null,
                'is_active' => $dutyScheduleData['is_active'] ?? true,
            ]);

            $this->activityLogService->logCreate($dutySchedule);

            // İlişkileri yükle
            $dutySchedule->load(['user', 'tenant']);

            return $dutySchedule;
        });
    }
}
