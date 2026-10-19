<?php

namespace App\Actions;

use App\Models\FormSurvey;
use App\Models\FormSurveyResponse;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateFormSurveyResponseAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a form survey response.
     *
     * @param  array  $responseData
     * @return \App\Models\FormSurveyResponse
     * @throws \Exception
     */
    public function execute(array $responseData): FormSurveyResponse
    {
        return DB::transaction(function () use ($responseData) {
            $survey = FormSurvey::findOrFail($responseData['form_survey_id']);

            // Anket aktif mi kontrolü
            if (!$survey->isActive()) {
                throw new \Exception('Bu anket aktif değil veya süresi dolmuş.');
            }

            $isAnonymous = $responseData['is_anonymous'] ?? false;

            // Anonim izni kontrolü
            if ($isAnonymous && !$survey->allow_anonymous) {
                throw new \Exception('Bu anket anonim cevap kabul etmiyor.');
            }

            // Duplicate kontrolü (anonim hariç)
            if (!$isAnonymous && $responseData['respondent_id']) {
                $existing = FormSurveyResponse::where('form_survey_id', $responseData['form_survey_id'])
                    ->where('respondent_id', $responseData['respondent_id'])
                    ->first();

                if ($existing) {
                    throw new \Exception('Bu ankete zaten cevap verdiniz.');
                }
            }

            $response = FormSurveyResponse::create([
                'form_survey_id' => $responseData['form_survey_id'],
                'respondent_id' => $isAnonymous ? null : ($responseData['respondent_id'] ?? Auth::id()),
                'respondent_type' => $responseData['respondent_type'] ?? null,
                'answers' => $responseData['answers'],
                'notes' => $responseData['notes'] ?? null,
                'is_anonymous' => $isAnonymous,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($response);

            // İlişkileri yükle
            $response->load(['formSurvey', 'respondent', 'creator']);

            return $response;
        });
    }
}
