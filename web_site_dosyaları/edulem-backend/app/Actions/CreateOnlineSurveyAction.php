<?php

namespace App\Actions;

use App\Models\OnlineSurvey;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOnlineSurveyAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an online survey.
     *
     * @param  array  $surveyData
     * @return \App\Models\OnlineSurvey
     * @throws \Exception
     */
    public function execute(array $surveyData): OnlineSurvey
    {
        return DB::transaction(function () use ($surveyData) {
            $survey = OnlineSurvey::create([
                'title' => $surveyData['title'],
                'description' => $surveyData['description'] ?? null,
                'target_audience' => $surveyData['target_audience'],
                'start_date' => $surveyData['start_date'],
                'end_date' => $surveyData['end_date'],
                'is_active' => $surveyData['is_active'] ?? true,
                'allow_anonymous' => $surveyData['allow_anonymous'] ?? false,
                'show_results' => $surveyData['show_results'] ?? true,
                'is_required' => $surveyData['is_required'] ?? false,
                'question_count' => 0, // Sorular eklendikçe güncellenecek
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($survey);

            // İlişkileri yükle
            $survey->load(['creator']);

            return $survey;
        });
    }
}
