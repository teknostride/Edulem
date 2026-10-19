<?php

namespace App\Actions;

use App\Models\QuestionBank;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateQuestionBankAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a question bank entry.
     *
     * @param  array  $questionData
     * @return \App\Models\QuestionBank
     * @throws \Exception
     */
    public function execute(array $questionData): QuestionBank
    {
        return DB::transaction(function () use ($questionData) {
            $question = QuestionBank::create([
                'question_text' => $questionData['question_text'],
                'question_image_url' => $questionData['question_image_url'] ?? null,
                'question_type' => $questionData['question_type'],
                'options' => $questionData['options'] ?? null,
                'correct_answer' => $questionData['correct_answer'],
                'correct_answers' => $questionData['correct_answers'] ?? null,
                'explanation' => $questionData['explanation'] ?? null,
                'question_bank_topic_id' => $questionData['question_bank_topic_id'] ?? null,
                'lesson_id' => $questionData['lesson_id'] ?? null,
                'difficulty_level' => $questionData['difficulty_level'],
                'estimated_time_minutes' => $questionData['estimated_time_minutes'] ?? 2,
                'points' => $questionData['points'] ?? 1,
                'school_type' => $questionData['school_type'] ?? null,
                'grade_level' => $questionData['grade_level'] ?? null,
                'tags' => $questionData['tags'] ?? null,
                'related_question_ids' => $questionData['related_question_ids'] ?? null,
                'is_active' => $questionData['is_active'] ?? true,
                'is_public' => $questionData['is_public'] ?? false,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($question);

            // İlişkileri yükle
            $question->load(['topic', 'lesson', 'creator']);

            return $question;
        });
    }
}
