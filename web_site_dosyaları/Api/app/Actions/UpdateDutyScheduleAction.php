<?php

namespace App\Actions;

use App\Models\DutySchedule;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateDutyScheduleAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a duty schedule.
     *
     * @param  \App\Models\DutySchedule  $dutySchedule
     * @param  array  $dutyScheduleData
     * @return \App\Models\DutySchedule
     * @throws \Exception
     */
    public function execute(DutySchedule $dutySchedule, array $dutyScheduleData): DutySchedule
    {
        return DB::transaction(function () use ($dutySchedule, $dutyScheduleData) {
            // Çakışma kontrolü (kendisi hariç)
            if (isset($dutyScheduleData['user_id']) || isset($dutyScheduleData['day_of_week']) || 
                isset($dutyScheduleData['start_time']) || isset($dutyScheduleData['end_time'])) {
                
                $userId = $dutyScheduleData['user_id'] ?? $dutySchedule->user_id;
                $dayOfWeek = $dutyScheduleData['day_of_week'] ?? $dutySchedule->day_of_week;
                $startTime = $dutyScheduleData['start_time'] ?? $dutySchedule->start_time;
                $endTime = $dutyScheduleData['end_time'] ?? $dutySchedule->end_time;
                $campusId = array_key_exists('campus_id', $dutyScheduleData) ? $dutyScheduleData['campus_id'] : $dutySchedule->campus_id;
                $educationLevelId = array_key_exists('education_level_id', $dutyScheduleData) ? $dutyScheduleData['education_level_id'] : $dutySchedule->education_level_id;

                $conflicts = DutySchedule::where('tenant_id', Auth::user()->tenant_id)
                    ->where('id', '!=', $dutySchedule->id)
                    ->where('user_id', $userId)
                    ->where('day_of_week', $dayOfWeek)
                    ->when($campusId !== null, fn ($q) => $q->where('campus_id', (int) $campusId))
                    ->when($educationLevelId !== null, fn ($q) => $q->where('education_level_id', (int) $educationLevelId))
                    ->where('is_active', true)
                    ->get()
                    ->filter(function ($existing) use ($startTime, $endTime) {
                        $newStart = strtotime($startTime);
                        $newEnd = strtotime($endTime);
                        $existingStart = strtotime($existing->start_time);
                        $existingEnd = strtotime($existing->end_time);
                        
                        return !($newEnd <= $existingStart || $newStart >= $existingEnd);
                    });

                if ($conflicts->isNotEmpty()) {
                    throw new \Exception('Bu personel için aynı gün ve saatte zaten bir nöbet programı bulunmaktadır.');
                }
            }

            $dutySchedule->update($dutyScheduleData);

            $this->activityLogService->logUpdate($dutySchedule);

            return $dutySchedule->fresh(['user', 'tenant']);
        });
    }
}
