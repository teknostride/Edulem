<?php

namespace App\Actions;

use App\Models\Homework;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateHomeworkAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a homework record.
     *
     * @param  array  $homeworkData
     * @return \App\Models\Homework
     * @throws \Exception
     */
    public function execute(array $homeworkData): Homework
    {
        return DB::transaction(function () use ($homeworkData) {
            $homework = Homework::create([
                'tenant_id' => Auth::user()->tenant_id,
                'lesson_id' => $homeworkData['lesson_id'],
                'classroom_id' => $homeworkData['classroom_id'] ?? null,
                'assignment_mode' => $homeworkData['assignment_mode'] ?? 'all_class',
                'teacher_id' => Auth::id(),
                'title' => $homeworkData['title'],
                'description' => $homeworkData['description'] ?? null,
                'due_date' => $homeworkData['due_date'],
                'file_id' => $homeworkData['file_id'] ?? null,
                'is_active' => $homeworkData['is_active'] ?? true,
                'is_online' => $homeworkData['is_online'] ?? false,
                'question_ids' => $homeworkData['question_ids'] ?? null,
                'is_project' => $homeworkData['is_project'] ?? false,
                'project_topics' => $homeworkData['project_topics'] ?? null,
            ]);

            $this->activityLogService->logCreate($homework);

            // İlişkileri yükle
            $homework->load(['lesson', 'classroom', 'teacher', 'file']);

            return $homework;
        });
    }
}
