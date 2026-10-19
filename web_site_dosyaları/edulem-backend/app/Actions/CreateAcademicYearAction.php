<?php

namespace App\Actions;

use App\Models\AcademicYear;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAcademicYearAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an academic year.
     *
     * @param  array  $academicYearData
     * @return \App\Models\AcademicYear
     * @throws \Exception
     */
    public function execute(array $academicYearData): AcademicYear
    {
        return DB::transaction(function () use ($academicYearData) {
            // Eğer yeni sezon aktif yapılıyorsa, diğer aktif sezonları pasif yap
            if ($academicYearData['is_active'] ?? false) {
                AcademicYear::where('tenant_id', Auth::user()->tenant_id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $academicYear = AcademicYear::create([
                'tenant_id' => Auth::user()->tenant_id,
                'name' => $academicYearData['name'],
                'code' => $academicYearData['code'],
                'start_date' => $academicYearData['start_date'],
                'end_date' => $academicYearData['end_date'],
                'is_active' => $academicYearData['is_active'] ?? false,
                'description' => $academicYearData['description'] ?? null,
            ]);

            $this->activityLogService->logCreate($academicYear);

            return $academicYear;
        });
    }
}
