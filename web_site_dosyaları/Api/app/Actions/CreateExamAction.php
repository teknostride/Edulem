<?php

namespace App\Actions;

use App\Models\Exam;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateExamAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an exam record.
     *
     * @param  array  $examData
     * @return \App\Models\Exam
     * @throws \Exception
     */
    public function execute(array $examData): Exam
    {
        return DB::transaction(function () use ($examData) {
            $exam = Exam::create([
                'tenant_id' => Auth::user()->tenant_id,
                'name' => $examData['name'],
                'description' => $examData['description'] ?? null,
                'lesson_id' => $examData['lesson_id'],
                'classroom_id' => $examData['classroom_id'] ?? null,
                'exam_date' => $examData['exam_date'],
                'duration_minutes' => $examData['duration_minutes'] ?? null,
                'total_points' => $examData['total_points'] ?? 100,
                'type' => $examData['type'] ?? 'written',
                'is_optical_form' => $examData['is_optical_form'] ?? false,
                'optical_form_file_id' => $examData['optical_form_file_id'] ?? null,
                'optical_form_status' => $examData['is_optical_form'] ? 'pending' : null,
                'is_active' => $examData['is_active'] ?? true,
            ]);

            $this->activityLogService->logCreate($exam);

            // İlişkileri yükle
            $exam->load(['lesson', 'classroom']);

            return $exam;
        });
    }
}
