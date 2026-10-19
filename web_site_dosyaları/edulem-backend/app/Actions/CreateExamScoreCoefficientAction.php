<?php

namespace App\Actions;

use App\Models\ExamScoreCoefficient;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateExamScoreCoefficientAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an exam score coefficient.
     *
     * @param  array  $coefficientData
     * @return \App\Models\ExamScoreCoefficient
     * @throws \Exception
     */
    public function execute(array $coefficientData): ExamScoreCoefficient
    {
        return DB::transaction(function () use ($coefficientData) {
            $coefficient = ExamScoreCoefficient::create([
                'tenant_id' => Auth::user()->tenant_id,
                'exam_id' => $coefficientData['exam_id'],
                'coefficient_type' => $coefficientData['coefficient_type'],
                'coefficient_name' => $coefficientData['coefficient_name'] ?? null,
                'coefficients' => $coefficientData['coefficients'],
                'is_active' => $coefficientData['is_active'] ?? true,
            ]);

            $this->activityLogService->logCreate($coefficient);

            // İlişkileri yükle
            $coefficient->load(['exam']);

            return $coefficient;
        });
    }
}
