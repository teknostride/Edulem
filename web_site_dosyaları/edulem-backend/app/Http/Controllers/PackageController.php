<?php

namespace App\Http\Controllers;

use App\Actions\CreatePackageAction;
use App\Actions\UpdatePackageAction;
use App\Http\Requests\StorePackageRequest;
use App\Http\Requests\UpdatePackageRequest;
use App\Http\Resources\PackageResource;
use App\Models\Package;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class PackageController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of packages.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Package::class);

        $query = Package::query();

        // Sadece aktif paketleri göster (SuperAdmin hariç)
        if (!auth()->user()->isSuperAdmin()) {
            $query->where('is_active', true);
        }

        // Filtreleme
        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        // Sıralama
        $query->orderBy('sort_order', 'asc')->orderBy('base_price', 'asc');

        $packages = $query->paginate(request('per_page', 50));

        return $this->success([
            'packages' => PackageResource::collection($packages),
            'pagination' => [
                'current_page' => $packages->currentPage(),
                'last_page' => $packages->lastPage(),
                'per_page' => $packages->perPage(),
                'total' => $packages->total(),
            ],
        ], 'Paketler başarıyla listelendi.');
    }

    /**
     * Store a newly created package in storage.
     */
    public function store(StorePackageRequest $request, CreatePackageAction $createPackageAction): JsonResponse
    {
        Gate::authorize('create', Package::class);

        try {
            $package = $createPackageAction->execute($request->validated());
            return $this->success(new PackageResource($package), 'Paket başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Paket oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified package.
     */
    public function show(Package $package): JsonResponse
    {
        Gate::authorize('view', $package);

        return $this->success(new PackageResource($package), 'Paket başarıyla getirildi.');
    }

    /**
     * Update the specified package in storage.
     */
    public function update(UpdatePackageRequest $request, Package $package, UpdatePackageAction $updatePackageAction): JsonResponse
    {
        Gate::authorize('update', $package);

        try {
            $updatedPackage = $updatePackageAction->execute($package, $request->validated());
            return $this->success(new PackageResource($updatedPackage), 'Paket başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Paket güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified package from storage.
     */
    public function destroy(Package $package): JsonResponse
    {
        Gate::authorize('delete', $package);

        try {
            $this->activityLogService->logDelete($package);
            $package->delete();
            return $this->success([], 'Paket başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Paket silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
