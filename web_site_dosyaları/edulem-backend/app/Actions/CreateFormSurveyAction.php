<?php

namespace App\Actions;

use App\Models\FormSurvey;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateFormSurveyAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a form survey.
     *
     * @param  array  $surveyData
     * @return \App\Models\FormSurvey
     * @throws \Exception
     */
    public function execute(array $surveyData): FormSurvey
    {
        return DB::transaction(function () use ($surveyData) {
            $survey = FormSurvey::create([
                'survey_type' => $surveyData['survey_type'],
                'title' => $surveyData['title'],
                'description' => $surveyData['description'] ?? null,
                'questions' => $surveyData['questions'],
                'target_audience' => $surveyData['target_audience'],
                'start_date' => $surveyData['start_date'],
                'end_date' => $surveyData['end_date'],
                'is_active' => $surveyData['is_active'] ?? true,
                'allow_anonymous' => $surveyData['allow_anonymous'] ?? false,
                'show_results' => $surveyData['show_results'] ?? true,
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
