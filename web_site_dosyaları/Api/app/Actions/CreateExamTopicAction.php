<?php

namespace App\Actions;

use App\Models\ExamTopic;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateExamTopicAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an exam topic.
     *
     * @param  array  $topicData
     * @return \App\Models\ExamTopic
     * @throws \Exception
     */
    public function execute(array $topicData): ExamTopic
    {
        return DB::transaction(function () use ($topicData) {
            $topic = ExamTopic::create([
                'tenant_id' => Auth::user()->tenant_id,
                'exam_id' => $topicData['exam_id'],
                'topic_name' => $topicData['topic_name'],
                'question_count' => $topicData['question_count'] ?? 0,
                'total_points' => $topicData['total_points'] ?? 0,
                'sort_order' => $topicData['sort_order'] ?? 0,
            ]);

            $this->activityLogService->logCreate($topic);

            // İlişkileri yükle
            $topic->load(['exam']);

            return $topic;
        });
    }
}
