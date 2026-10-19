<?php

namespace App\Actions;

use App\Models\Exam;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateExamAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update an exam record.
     *
     * @param  \App\Models\Exam  $exam
     * @param  array  $examData
     * @return \App\Models\Exam
     * @throws \Exception
     */
    public function execute(Exam $exam, array $examData): Exam
    {
        return DB::transaction(function () use ($exam, $examData) {
            $exam->update([
                'name' => $examData['name'] ?? $exam->name,
                'description' => $examData['description'] ?? $exam->description,
                'lesson_id' => $examData['lesson_id'] ?? $exam->lesson_id,
                'classroom_id' => $examData['classroom_id'] ?? $exam->classroom_id,
                'exam_date' => $examData['exam_date'] ?? $exam->exam_date,
                'duration_minutes' => $examData['duration_minutes'] ?? $exam->duration_minutes,
                'total_points' => $examData['total_points'] ?? $exam->total_points,
                'type' => $examData['type'] ?? $exam->type,
                'is_optical_form' => $examData['is_optical_form'] ?? $exam->is_optical_form,
                'optical_form_file_id' => $examData['optical_form_file_id'] ?? $exam->optical_form_file_id,
                'optical_form_status' => $examData['optical_form_status'] ?? $exam->optical_form_status,
                'optical_form_notes' => $examData['optical_form_notes'] ?? $exam->optical_form_notes,
                'is_active' => $examData['is_active'] ?? $exam->is_active,
            ]);

            $this->activityLogService->logUpdate($exam);

            // İlişkileri yükle
            $exam->load(['lesson', 'classroom']);

            return $exam;
        });
    }
}
