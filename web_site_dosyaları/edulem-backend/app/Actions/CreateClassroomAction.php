<?php

namespace App\Actions;

use App\Models\Classroom;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateClassroomAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a classroom.
     *
     * @param  array  $classroomData
     * @return \App\Models\Classroom
     * @throws \Exception
     */
    public function execute(array $classroomData): Classroom
    {
        return DB::transaction(function () use ($classroomData) {
            // Code otomatik generate et (nullable ise)
            $code = $classroomData['code'] ?? null;
            if (empty($code)) {
                $code = $this->generateUniqueCode($classroomData['name'], $classroomData['branch_id'] ?? null, Auth::user()->tenant_id);
            }

            $classroom = Classroom::create([
                'tenant_id' => Auth::user()->tenant_id,
                'branch_id' => $classroomData['branch_id'] ?? null,
                'name' => $classroomData['name'],
                'code' => $code,
                'capacity' => $classroomData['capacity'],
                'teacher_id' => $classroomData['teacher_id'] ?? null,
                'grade_level' => $classroomData['grade_level'] ?? '',
                'is_active' => $classroomData['is_active'] ?? true,
            ]);

            $this->activityLogService->logCreate($classroom);

            // İlişkileri yükle
            $classroom->load(['teacher', 'tenant']);

            return $classroom;
        });
    }

    /**
     * Unique code generate et
     */
    private function generateUniqueCode(string $name, ?int $branchId, int $tenantId): string
    {
        // Base code: sınıf adından alphanumeric karakterler
        $baseCode = preg_replace('/[^a-zA-Z0-9]/', '', $name);
        $baseCode = strtoupper($baseCode) ?: 'CLASS'; // Fallback

        // Tenant + Branch + Base kombinasyonuyla try et
        $code = $baseCode;
        $counter = 1;
        $maxAttempts = 100;

        while ($counter <= $maxAttempts) {
            $existingCode = Classroom::where('tenant_id', $tenantId)
                ->where('code', $code)
                ->first();

            if (!$existingCode) {
                return $code;
            }

            // Counter ile suffix ekle
            $code = $baseCode . '-' . $counter;
            $counter++;
        }

        // Fallback: UUID-like kod
        return $baseCode . '-' . substr(uniqid(), -6);
    }
}
