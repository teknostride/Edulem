<?php

namespace App\Actions;

use App\Models\QuestionBankTopic;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateQuestionBankTopicAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a question bank topic.
     *
     * @param  array  $topicData
     * @return \App\Models\QuestionBankTopic
     * @throws \Exception
     */
    public function execute(array $topicData): QuestionBankTopic
    {
        return DB::transaction(function () use ($topicData) {
            $topic = QuestionBankTopic::create([
                'name' => $topicData['name'],
                'description' => $topicData['description'] ?? null,
                'lesson_id' => $topicData['lesson_id'] ?? null,
                'order' => $topicData['order'] ?? 0,
                'is_active' => $topicData['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($topic);

            // İlişkileri yükle
            $topic->load(['lesson', 'creator']);

            return $topic;
        });
    }
}
