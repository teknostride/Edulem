<?php

namespace App\Actions;

use App\Models\OnlineSurvey;
use App\Models\OnlineSurveyResponse;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOnlineSurveyResponseAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an online survey response.
     *
     * @param  array  $responseData
     * @return \App\Models\OnlineSurveyResponse
     * @throws \Exception
     */
    public function execute(array $responseData): OnlineSurveyResponse
    {
        return DB::transaction(function () use ($responseData) {
            $survey = OnlineSurvey::findOrFail($responseData['online_survey_id']);

            // Anket aktif mi kontrolü
            if (!$survey->isActive()) {
                throw new \Exception('Bu anket aktif değil veya süresi dolmuş.');
            }

            $isAnonymous = $responseData['is_anonymous'] ?? false;

            // respondent_type otomatik belirle (UI her zaman göndermeyebilir)
            $resolvedRespondentType = $responseData['respondent_type'] ?? null;
            $respondentEducationLevelId = $responseData['respondent_education_level_id'] ?? null;
            if (!$resolvedRespondentType) {
                $authUser = Auth::user();
                if ($authUser instanceof Student) {
                    $resolvedRespondentType = 'guardian';
                } else {
                    $roleId = (int) ($authUser?->role_id ?? 0);
                    $roleName = (string) ($authUser?->role?->name ?? '');
                    $isTeacher = in_array($roleId, [5, 6], true) || in_array($roleName, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen'], true);
                    $resolvedRespondentType = $isTeacher ? 'teacher' : 'staff';

                    if ($isTeacher) {
                        $educationLevelIds = is_array($authUser?->education_level_ids) ? array_values(array_filter($authUser->education_level_ids)) : [];
                        if (count($educationLevelIds) === 1) {
                            $respondentEducationLevelId = $educationLevelIds[0];
                        } elseif (count($educationLevelIds) > 1) {
                            if (!$respondentEducationLevelId) {
                                throw new \Exception('Birden fazla kademeye atamanız olduğu için lütfen kademe seçiniz.');
                            }
                            if (!in_array((int) $respondentEducationLevelId, array_map('intval', $educationLevelIds), true)) {
                                throw new \Exception('Seçilen kademe atamalarınız arasında bulunmuyor.');
                            }
                        }
                    }
                }
            }

            // Anonim izni kontrolü
            if ($isAnonymous && !$survey->allow_anonymous) {
                throw new \Exception('Bu anket anonim cevap kabul etmiyor.');
            }

            // Duplicate kontrolü (anonim hariç)
            if (!$isAnonymous) {
                $respondentId = $responseData['respondent_id'] ?? Auth::id();
                if ($respondentId && $survey->hasUserResponded($respondentId)) {
                    throw new \Exception('Bu ankete zaten cevap verdiniz.');
                }
            }

            // Öğrenci (Student) users tablosunda olmadığı için respondent_id null olmalı
            $authUser = Auth::user();
            $isStudentUser = $authUser instanceof Student;
            $respondentId = $isAnonymous ? null : ($responseData['respondent_id'] ?? ($isStudentUser ? null : Auth::id()));

            $response = OnlineSurveyResponse::create([
                'online_survey_id' => $responseData['online_survey_id'],
                'respondent_id' => $respondentId,
                'respondent_type' => $resolvedRespondentType,
                'respondent_education_level_id' => $respondentEducationLevelId,
                'answers' => $responseData['answers'],
                'notes' => $responseData['notes'] ?? null,
                'is_anonymous' => $isAnonymous,
                'created_by' => $isStudentUser ? null : Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($response);

            // İlişkileri yükle
            $response->load(['onlineSurvey', 'respondent', 'creator']);

            return $response;
        });
    }
}
