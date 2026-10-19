<?php

namespace App\Actions;

use App\Models\Lesson;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateLessonAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a lesson.
     *
     * @param  \App\Models\Lesson  $lesson
     * @param  array  $lessonData
     * @return \App\Models\Lesson
     * @throws \Exception
     */
    public function execute(Lesson $lesson, array $lessonData): Lesson
    {
        return DB::transaction(function () use ($lesson, $lessonData) {
            // Eski değerleri sakla (activity log için)
            $oldValues = $lesson->getOriginal();

            $lesson->update([
                'name' => $lessonData['name'] ?? $lesson->name,
                'code' => $lessonData['code'] ?? $lesson->code,
                'description' => $lessonData['description'] ?? $lesson->description,
            ]);

            $this->activityLogService->logUpdate($lesson);

            // İlişkileri yükle
            $lesson->load(['tenant']);

            return $lesson;
        });
    }
}
