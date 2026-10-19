<?php

namespace App\Actions;

use App\Models\Grade;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateGradeAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a grade record.
     *
     * @param  array  $gradeData
     * @return \App\Models\Grade
     * @throws \Exception
     */
    public function execute(array $gradeData): Grade
    {
        return DB::transaction(function () use ($gradeData) {
            // Unique constraint kontrolü: Bir öğrenci bir sınav için bir not
            $existingGrade = Grade::where('student_id', $gradeData['student_id'])
                ->where('exam_id', $gradeData['exam_id'])
                ->first();

            if ($existingGrade) {
                throw new \Exception('Bu öğrenci için bu sınavda zaten bir not kaydı bulunmaktadır.');
            }

            $grade = Grade::create([
                'tenant_id' => Auth::user()->tenant_id,
                'student_id' => $gradeData['student_id'],
                'exam_id' => $gradeData['exam_id'],
                'teacher_id' => Auth::id(),
                'grade_type' => $gradeData['grade_type'] ?? 'written',
                'semester' => $gradeData['semester'] ?? null,
                'grade' => $gradeData['grade'],
                'score' => $gradeData['score'] ?? null,
                'answers' => $gradeData['answers'] ?? null,
                'question_topics' => $gradeData['question_topics'] ?? null,
                'notes' => $gradeData['notes'] ?? null,
            ]);

            $this->activityLogService->logCreate($grade);

            // İlişkileri yükle
            $grade->load(['student', 'exam', 'teacher']);

            return $grade;
        });
    }
}
