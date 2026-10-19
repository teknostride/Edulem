<?php

namespace App\Actions;

use App\Models\Grade;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateGradeAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a grade record.
     *
     * @param  \App\Models\Grade  $grade
     * @param  array  $gradeData
     * @return \App\Models\Grade
     * @throws \Exception
     */
    public function execute(Grade $grade, array $gradeData): Grade
    {
        return DB::transaction(function () use ($grade, $gradeData) {
            $grade->update([
                'grade_type' => $gradeData['grade_type'] ?? $grade->grade_type,
                'semester' => $gradeData['semester'] ?? $grade->semester,
                'grade' => $gradeData['grade'] ?? $grade->grade,
                'score' => $gradeData['score'] ?? $grade->score,
                'answers' => $gradeData['answers'] ?? $grade->answers,
                'question_topics' => $gradeData['question_topics'] ?? $grade->question_topics,
                'notes' => $gradeData['notes'] ?? $grade->notes,
            ]);

            $this->activityLogService->logUpdate($grade);

            // İlişkileri yükle
            $grade->load(['student', 'exam', 'teacher']);

            return $grade;
        });
    }
}
