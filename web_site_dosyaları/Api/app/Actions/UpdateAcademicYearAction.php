<?php

namespace App\Actions;

use App\Models\AcademicYear;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAcademicYearAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update an academic year.
     *
     * @param  \App\Models\AcademicYear  $academicYear
     * @param  array  $academicYearData
     * @return \App\Models\AcademicYear
     * @throws \Exception
     */
    public function execute(AcademicYear $academicYear, array $academicYearData): AcademicYear
    {
        return DB::transaction(function () use ($academicYear, $academicYearData) {
            // Eğer yeni sezon aktif yapılıyorsa, diğer aktif sezonları pasif yap
            if (isset($academicYearData['is_active']) && $academicYearData['is_active']) {
                AcademicYear::where('tenant_id', Auth::user()->tenant_id)
                    ->where('id', '!=', $academicYear->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $academicYear->update($academicYearData);

            $this->activityLogService->logUpdate($academicYear);

            return $academicYear->fresh();
        });
    }
}
