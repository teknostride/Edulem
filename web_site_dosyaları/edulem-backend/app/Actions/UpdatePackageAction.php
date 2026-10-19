<?php

namespace App\Actions;

use App\Models\Package;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdatePackageAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a package.
     *
     * @param  \App\Models\Package  $package
     * @param  array  $packageData
     * @return \App\Models\Package
     * @throws \Exception
     */
    public function execute(Package $package, array $packageData): Package
    {
        return DB::transaction(function () use ($package, $packageData) {
            $package->update([
                'name' => $packageData['name'] ?? $package->name,
                'slug' => $packageData['slug'] ?? $package->slug,
                'description' => $packageData['description'] ?? $package->description,
                'base_price' => $packageData['base_price'] ?? $package->base_price,
                'price_per_student' => $packageData['price_per_student'] ?? $package->price_per_student,
                'max_students' => $packageData['max_students'] ?? $package->max_students,
                'max_users' => $packageData['max_users'] ?? $package->max_users,
                'max_storage_gb' => $packageData['max_storage_gb'] ?? $package->max_storage_gb,
                'modules' => $packageData['modules'] ?? $package->modules,
                'features' => $packageData['features'] ?? $package->features,
                'is_active' => $packageData['is_active'] ?? $package->is_active,
                'sort_order' => $packageData['sort_order'] ?? $package->sort_order,
            ]);

            $this->activityLogService->logUpdate($package);

            return $package;
        });
    }
}
