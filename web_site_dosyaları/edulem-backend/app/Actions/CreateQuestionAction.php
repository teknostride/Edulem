<?php

namespace App\Actions;

use App\Models\Question;
use App\Models\QuestionDailyLimit;
use App\Models\Setting;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateQuestionAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a question record.
     *
     * @param  array  $questionData
     * @return \App\Models\Question
     * @throws \Exception
     */
    public function execute(array $questionData): Question
    {
        return DB::transaction(function () use ($questionData) {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            // Günlük limit kontrolü
            $userType = null;
            if (!empty($questionData['student_id'])) {
                $userType = 'student';
            } elseif (!empty($questionData['guardian_id'])) {
                $userType = 'guardian';
            }

            if ($userType) {
                // Önce Settings'ten limit kontrolü yap (öncelikli)
                $limitEnabled = Setting::where('tenant_id', $tenantId)
                    ->where('key', 'question_daily_limit_enabled')
                    ->value('value');
                
                $limitEnabled = filter_var($limitEnabled ?? 'true', FILTER_VALIDATE_BOOLEAN);

                if ($limitEnabled) {
                    $limitKey = $userType === 'student' 
                        ? 'question_daily_limit_student' 
                        : 'question_daily_limit_guardian';
                    
                    $dailyLimitValue = Setting::where('tenant_id', $tenantId)
                        ->where('key', $limitKey)
                        ->value('value');
                    
                    $dailyLimit = $dailyLimitValue ? (int) $dailyLimitValue : null;

                    // Eğer Settings'te limit yoksa, QuestionDailyLimit tablosundan oku (geriye dönük uyumluluk)
                    if (!$dailyLimit) {
                        $dailyLimitModel = QuestionDailyLimit::where('tenant_id', $tenantId)
                            ->where('user_type', $userType)
                            ->where('is_active', true)
                            ->first();
                        
                        $dailyLimit = $dailyLimitModel?->daily_limit;
                    }

                    if ($dailyLimit && $dailyLimit > 0) {
                        $todayStart = now()->startOfDay();
                        $todayEnd = now()->endOfDay();

                        $todayQuestionCount = Question::where('tenant_id', $tenantId)
                            ->where(function ($query) use ($questionData) {
                                if (!empty($questionData['student_id'])) {
                                    $query->where('student_id', $questionData['student_id']);
                                } elseif (!empty($questionData['guardian_id'])) {
                                    $query->where('guardian_id', $questionData['guardian_id']);
                                }
                            })
                            ->whereBetween('created_at', [$todayStart, $todayEnd])
                            ->count();

                        if ($todayQuestionCount >= $dailyLimit) {
                            throw new \Exception("Günlük soru limitine ulaştınız. Bugün en fazla {$dailyLimit} soru sorabilirsiniz.");
                        }
                    }
                }
            }

            $question = Question::create([
                'tenant_id' => $tenantId,
                'student_id' => $questionData['student_id'] ?? null,
                'guardian_id' => $questionData['guardian_id'] ?? null,
                'subject' => $questionData['subject'],
                'message' => $questionData['message'],
                'audio_file_id' => $questionData['audio_file_id'] ?? null,
                'status' => $questionData['status'] ?? 'open',
                'assigned_to' => $questionData['assigned_to'] ?? null,
            ]);

            $this->activityLogService->logCreate($question);

            // İlişkileri yükle
            $question->load(['student', 'guardian', 'assignedUser']);

            return $question;
        });
    }
}
