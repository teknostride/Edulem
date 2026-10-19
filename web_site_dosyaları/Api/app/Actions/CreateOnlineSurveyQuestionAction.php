<?php

namespace App\Actions;

use App\Models\OnlineSurvey;
use App\Models\OnlineSurveyQuestion;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOnlineSurveyQuestionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an online survey question.
     *
     * @param  array  $questionData
     * @return \App\Models\OnlineSurveyQuestion
     * @throws \Exception
     */
    public function execute(array $questionData): OnlineSurveyQuestion
    {
        return DB::transaction(function () use ($questionData) {
            $survey = OnlineSurvey::findOrFail($questionData['online_survey_id']);

            $question = OnlineSurveyQuestion::create([
                'online_survey_id' => $questionData['online_survey_id'],
                'question' => $questionData['question'],
                'question_type' => $questionData['question_type'],
                'options' => $questionData['options'] ?? null,
                'is_required' => $questionData['is_required'] ?? false,
                'order' => $questionData['order'] ?? $survey->questions()->max('order') + 1,
            ]);

            // Soru sayısını güncelle
            $survey->update([
                'question_count' => $survey->questions()->count(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($question);
            $this->activityLogService->logUpdate($survey);

            // İlişkileri yükle
            $question->load(['onlineSurvey']);

            return $question;
        });
    }
}
