<?php

namespace App\Actions;

use App\Models\CurriculumTracking;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateCurriculumTrackingAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a curriculum tracking record.
     *
     * @param  array  $trackingData
     * @return \App\Models\CurriculumTracking
     * @throws \Exception
     */
    public function execute(array $trackingData): CurriculumTracking
    {
        return DB::transaction(function () use ($trackingData) {
            $tracking = CurriculumTracking::create([
                'lesson_id' => $trackingData['lesson_id'],
                'classroom_id' => $trackingData['classroom_id'] ?? null,
                'teacher_id' => $trackingData['teacher_id'],
                'teaching_date' => $trackingData['teaching_date'],
                'topic' => $trackingData['topic'],
                'topic_description' => $trackingData['topic_description'] ?? null,
                'lesson_hour' => $trackingData['lesson_hour'] ?? 1,
                'notes' => $trackingData['notes'] ?? null,
                'materials' => $trackingData['materials'] ?? null,
                'activities' => $trackingData['activities'] ?? null,
                'is_completed' => $trackingData['is_completed'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($tracking);

            // İlişkileri yükle
            $tracking->load(['lesson', 'classroom', 'teacher', 'creator']);

            return $tracking;
        });
    }
}
