<?php

namespace App\Actions;

use App\Models\Homework;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateHomeworkAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a homework record.
     *
     * @param  \App\Models\Homework  $homework
     * @param  array  $homeworkData
     * @return \App\Models\Homework
     * @throws \Exception
     */
    public function execute(Homework $homework, array $homeworkData): Homework
    {
        return DB::transaction(function () use ($homework, $homeworkData) {
            $homework->update([
                'lesson_id' => $homeworkData['lesson_id'] ?? $homework->lesson_id,
                'classroom_id' => $homeworkData['classroom_id'] ?? $homework->classroom_id,
                'assignment_mode' => $homeworkData['assignment_mode'] ?? $homework->assignment_mode,
                'title' => $homeworkData['title'] ?? $homework->title,
                'description' => $homeworkData['description'] ?? $homework->description,
                'due_date' => $homeworkData['due_date'] ?? $homework->due_date,
                'file_id' => $homeworkData['file_id'] ?? $homework->file_id,
                'is_active' => $homeworkData['is_active'] ?? $homework->is_active,
                'is_online' => $homeworkData['is_online'] ?? $homework->is_online,
                'question_ids' => $homeworkData['question_ids'] ?? $homework->question_ids,
                'is_project' => $homeworkData['is_project'] ?? $homework->is_project,
                'project_topics' => $homeworkData['project_topics'] ?? $homework->project_topics,
            ]);

            $this->activityLogService->logUpdate($homework);

            // İlişkileri yükle
            $homework->load(['lesson', 'classroom', 'teacher', 'file']);

            return $homework;
        });
    }
}
