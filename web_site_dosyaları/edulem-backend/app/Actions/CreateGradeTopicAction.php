<?php

namespace App\Actions;

use App\Models\GradeTopic;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateGradeTopicAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a grade topic.
     *
     * @param  array  $topicData
     * @return \App\Models\GradeTopic
     * @throws \Exception
     */
    public function execute(array $topicData): GradeTopic
    {
        return DB::transaction(function () use ($topicData) {
            $topic = GradeTopic::create([
                'tenant_id' => Auth::user()->tenant_id,
                'grade_id' => $topicData['grade_id'],
                'topic_name' => $topicData['topic_name'],
                'question_number' => $topicData['question_number'] ?? null,
                'question_count' => $topicData['question_count'] ?? 1,
                'points' => $topicData['points'] ?? 0,
                'sort_order' => $topicData['sort_order'] ?? 0,
            ]);

            $this->activityLogService->logCreate($topic);

            // İlişkileri yükle
            $topic->load(['grade']);

            return $topic;
        });
    }
}
