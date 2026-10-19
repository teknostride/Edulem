<?php

namespace App\Actions;

use App\Models\Activity;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateActivityAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an activity.
     *
     * @param  array  $activityData
     * @return \App\Models\Activity
     * @throws \Exception
     */
    public function execute(array $activityData): Activity
    {
        return DB::transaction(function () use ($activityData) {
            $activity = Activity::create([
                'title' => $activityData['title'],
                'description' => $activityData['description'] ?? null,
                'category' => $activityData['category'] ?? 'other',
                'activity_date' => $activityData['activity_date'],
                'activity_time' => $activityData['activity_time'] ?? null,
                'location' => $activityData['location'] ?? null,
                'share_type' => $activityData['share_type'] ?? 'target_group',
                'target_student_ids' => $activityData['target_student_ids'] ?? null,
                'classroom_id' => $activityData['classroom_id'] ?? null,
                'photo_file_ids' => $activityData['photo_file_ids'] ?? null,
                'video_file_ids' => $activityData['video_file_ids'] ?? null,
                'document_file_ids' => $activityData['document_file_ids'] ?? null,
                'is_published' => $activityData['is_published'] ?? true,
                'requires_admin_approval' => $activityData['requires_admin_approval'] ?? false,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($activity);

            // İlişkileri yükle
            $activity->load(['classroom', 'creator']);

            return $activity;
        });
    }
}
