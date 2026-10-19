<?php

namespace App\Actions;

use App\Models\Bulletin;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateBulletinAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a bulletin.
     *
     * @param  array  $bulletinData
     * @return \App\Models\Bulletin
     * @throws \Exception
     */
    public function execute(array $bulletinData): Bulletin
    {
        return DB::transaction(function () use ($bulletinData) {
            $bulletin = Bulletin::create([
                'student_id' => $bulletinData['student_id'],
                'template_id' => $bulletinData['template_id'] ?? null,
                'title' => $bulletinData['title'],
                'content' => $bulletinData['content'] ?? null,
                'photo_ids' => $bulletinData['photo_ids'] ?? null,
                'teacher_comments' => $bulletinData['teacher_comments'] ?? null,
                'achievements' => $bulletinData['achievements'] ?? null,
                'bulletin_date' => $bulletinData['bulletin_date'],
                'is_published_to_guardian' => $bulletinData['is_published_to_guardian'] ?? false,
                'is_added_to_portfolio' => $bulletinData['is_added_to_portfolio'] ?? false,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($bulletin);

            // İlişkileri yükle
            $bulletin->load(['student', 'template', 'creator']);

            return $bulletin;
        });
    }
}
