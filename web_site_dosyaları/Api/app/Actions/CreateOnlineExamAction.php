<?php

namespace App\Actions;

use App\Models\OnlineExam;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateOnlineExamAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an online exam.
     *
     * @param  array  $examData
     * @return \App\Models\OnlineExam
     * @throws \Exception
     */
    public function execute(array $examData): OnlineExam
    {
        return DB::transaction(function () use ($examData) {
            // Soru sayısını kontrol et
            $questionIds = $examData['question_ids'] ?? [];
            $questionCount = count($questionIds);
            
            if ($questionCount !== ($examData['question_count'] ?? 0)) {
                $examData['question_count'] = $questionCount;
            }

            $exam = OnlineExam::create([
                'title' => $examData['title'],
                'description' => $examData['description'] ?? null,
                'lesson_id' => $examData['lesson_id'] ?? null,
                'classroom_id' => $examData['classroom_id'] ?? null,
                'question_ids' => $questionIds,
                'question_count' => $examData['question_count'],
                'duration_minutes' => $examData['duration_minutes'],
                'total_points' => $examData['total_points'] ?? 100,
                'scoring_formula' => $examData['scoring_formula'] ?? null,
                'points_per_question' => $examData['points_per_question'] ?? null,
                'negative_points' => $examData['negative_points'] ?? 0,
                'start_time' => $examData['start_time'],
                'end_time' => $examData['end_time'],
                'single_attempt' => $examData['single_attempt'] ?? true,
                'allow_retake' => $examData['allow_retake'] ?? false,
                'max_attempts' => $examData['max_attempts'] ?? 1,
                'auto_submit' => $examData['auto_submit'] ?? true,
                'show_results_immediately' => $examData['show_results_immediately'] ?? false,
                'show_correct_answers' => $examData['show_correct_answers'] ?? false,
                'shuffle_questions' => $examData['shuffle_questions'] ?? false,
                'shuffle_options' => $examData['shuffle_options'] ?? false,
                'status' => $examData['status'] ?? 'draft',
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($exam);

            // İlişkileri yükle
            $exam->load(['lesson', 'classroom', 'creator']);

            return $exam;
        });
    }
}
