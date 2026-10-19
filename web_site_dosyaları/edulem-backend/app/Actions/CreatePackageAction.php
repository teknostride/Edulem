<?php

namespace App\Actions;

use App\Models\Package;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class CreatePackageAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a package.
     *
     * @param  array  $packageData
     * @return \App\Models\Package
     * @throws \Exception
     */
    public function execute(array $packageData): Package
    {
        return DB::transaction(function () use ($packageData) {
            $package = Package::create([
                'name' => $packageData['name'],
                'slug' => $packageData['slug'],
                'description' => $packageData['description'] ?? null,
                'base_price' => $packageData['base_price'],
                'price_per_student' => $packageData['price_per_student'],
                'max_students' => $packageData['max_students'] ?? null,
                'max_users' => $packageData['max_users'] ?? null,
                'max_storage_gb' => $packageData['max_storage_gb'] ?? null,
                'modules' => $packageData['modules'] ?? [],
                'features' => $packageData['features'] ?? [],
                'is_active' => $packageData['is_active'] ?? true,
                'sort_order' => $packageData['sort_order'] ?? 0,
            ]);

            $this->activityLogService->logCreate($package);

            return $package;
        });
    }
}
