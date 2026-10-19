<?php

namespace App\Actions;

use App\Models\Classroom;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateClassroomAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a classroom.
     *
     * @param  \App\Models\Classroom  $classroom
     * @param  array  $classroomData
     * @return \App\Models\Classroom
     * @throws \Exception
     */
    public function execute(Classroom $classroom, array $classroomData): Classroom
    {
        return DB::transaction(function () use ($classroom, $classroomData) {
            // Eski değerleri sakla (activity log için)
            $oldValues = $classroom->getOriginal();

            $classroom->update([
                'name' => $classroomData['name'] ?? $classroom->name,
                'code' => $classroomData['code'] ?? $classroom->code,
                'capacity' => $classroomData['capacity'] ?? $classroom->capacity,
                'teacher_id' => $classroomData['teacher_id'] ?? $classroom->teacher_id,
                'grade_level' => $classroomData['grade_level'] ?? $classroom->grade_level,
                'is_active' => $classroomData['is_active'] ?? $classroom->is_active,
            ]);

            $this->activityLogService->logUpdate($classroom);

            // İlişkileri yükle
            $classroom->load(['teacher', 'tenant']);

            return $classroom;
        });
    }
}
