<?php

namespace App\Actions;

use App\Models\Lesson;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateLessonAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a lesson.
     *
     * @param  array  $lessonData
     * @return \App\Models\Lesson
     * @throws \Exception
     */
    public function execute(array $lessonData): Lesson
    {
        return DB::transaction(function () use ($lessonData) {
            $lesson = Lesson::create([
                'tenant_id' => Auth::user()->tenant_id,
                'name' => $lessonData['name'],
                'code' => $lessonData['code'],
                'description' => $lessonData['description'] ?? null,
            ]);

            $this->activityLogService->logCreate($lesson);

            // İlişkileri yükle
            $lesson->load(['tenant']);

            return $lesson;
        });
    }
}
