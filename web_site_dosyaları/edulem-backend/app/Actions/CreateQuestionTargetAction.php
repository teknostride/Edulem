<?php

namespace App\Actions;

use App\Models\QuestionTarget;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateQuestionTargetAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a question target.
     *
     * @param  array  $targetData
     * @return \App\Models\QuestionTarget
     * @throws \Exception
     */
    public function execute(array $targetData): QuestionTarget
    {
        return DB::transaction(function () use ($targetData) {
            // Aynı hafta için hedef var mı kontrol et
            $existing = QuestionTarget::where('tenant_id', $targetData['tenant_id'] ?? auth()->user()->tenant_id)
                ->where('student_id', $targetData['student_id'])
                ->where('week_start_date', $targetData['week_start_date'])
                ->first();

            if ($existing) {
                throw new \Exception('Bu öğrenci için bu hafta zaten bir hedef tanımlanmış.');
            }

            $target = QuestionTarget::create([
                'student_id' => $targetData['student_id'],
                'week_start_date' => $targetData['week_start_date'],
                'weekly_target' => $targetData['weekly_target'],
                'daily_targets' => $targetData['daily_targets'] ?? null,
                'lesson_targets' => $targetData['lesson_targets'] ?? null,
                'notes' => $targetData['notes'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($target);

            // İlişkileri yükle
            $target->load(['student', 'creator']);

            return $target;
        });
    }
}
