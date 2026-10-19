<?php

namespace App\Actions;

use App\Models\QuestionDailyLimit;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateQuestionDailyLimitAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a question daily limit.
     *
     * @param  array  $limitData
     * @return \App\Models\QuestionDailyLimit
     * @throws \Exception
     */
    public function execute(array $limitData): QuestionDailyLimit
    {
        return DB::transaction(function () use ($limitData) {
            // Eğer aynı tenant ve user_type için limit varsa güncelle
            $existingLimit = QuestionDailyLimit::where('tenant_id', Auth::user()->tenant_id)
                ->where('user_type', $limitData['user_type'])
                ->first();

            if ($existingLimit) {
                $existingLimit->update([
                    'daily_limit' => $limitData['daily_limit'],
                    'is_active' => $limitData['is_active'] ?? true,
                ]);
                $this->activityLogService->logUpdate($existingLimit);
                return $existingLimit;
            }

            $limit = QuestionDailyLimit::create([
                'tenant_id' => Auth::user()->tenant_id,
                'user_type' => $limitData['user_type'],
                'daily_limit' => $limitData['daily_limit'],
                'is_active' => $limitData['is_active'] ?? true,
            ]);

            $this->activityLogService->logCreate($limit);

            return $limit;
        });
    }
}
