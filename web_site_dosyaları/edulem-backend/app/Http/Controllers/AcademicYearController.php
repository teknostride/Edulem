<?php

namespace App\Http\Controllers;

use App\Actions\CreateAcademicYearAction;
use App\Actions\UpdateAcademicYearAction;
use App\Http\Requests\StoreAcademicYearRequest;
use App\Http\Requests\UpdateAcademicYearRequest;
use App\Http\Resources\AcademicYearResource;
use App\Models\AcademicYear;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AcademicYearController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of academic years.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', AcademicYear::class);

        $query = AcademicYear::withCount('students')
            ->latest('start_date');

        // Aktif sezon filtresi
        if (request('active_only')) {
            $query->active();
        }

        // Tarih bazlı filtreleme
        if (request('date')) {
            $query->forDate(request('date'));
        }

        $academicYears = $query->paginate(request('per_page', 15));

        $activeCount = AcademicYear::where('is_active', true)->count();
        $totalCount = AcademicYear::count();
        $currentActive = AcademicYear::active()->first();

        return $this->paginated(AcademicYearResource::collection($academicYears), [
            'active_count' => $activeCount,
            'total_count' => $totalCount,
            'current_active' => $currentActive ? new AcademicYearResource($currentActive) : null,
        ]);
    }

    /**
     * Store a newly created academic year in storage.
     */
    public function store(StoreAcademicYearRequest $request, CreateAcademicYearAction $createAcademicYearAction): JsonResponse
    {
        Gate::authorize('create', AcademicYear::class);

        $academicYear = $createAcademicYearAction->execute($request->validated());

        return $this->success(new AcademicYearResource($academicYear), 'Öğretim yılı başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified academic year.
     */
    public function show(AcademicYear $academicYear): JsonResponse
    {
        Gate::authorize('view', $academicYear);

        return $this->success(new AcademicYearResource($academicYear->loadCount('students')));
    }

    /**
     * Update the specified academic year in storage.
     */
    public function update(UpdateAcademicYearRequest $request, AcademicYear $academicYear, UpdateAcademicYearAction $updateAcademicYearAction): JsonResponse
    {
        Gate::authorize('update', $academicYear);

        $updatedAcademicYear = $updateAcademicYearAction->execute($academicYear, $request->validated());

        return $this->success(new AcademicYearResource($updatedAcademicYear), 'Öğretim yılı başarıyla güncellendi.');
    }

    /**
     * Remove the specified academic year from storage.
     */
    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        Gate::authorize('delete', $academicYear);

        // Öğrenci varsa silme işlemini engelle
        if ($academicYear->students()->count() > 0) {
            return $this->error('Bu öğretim yılına kayıtlı öğrenci bulunduğu için silinemez.', [], 422);
        }

        $this->activityLogService->logDelete($academicYear);
        $academicYear->delete();

        return $this->success(null, 'Öğretim yılı başarıyla silindi.');
    }

    /**
     * Get statistics for the academic year.
     */
    public function statistics(AcademicYear $academicYear): JsonResponse
    {
        Gate::authorize('view', $academicYear);

        $stats = [
            'total_students' => $academicYear->students()->count(),
            'active_students' => $academicYear->students()->whereHas('classroom', function ($query) {
                $query->where('is_active', true);
            })->count(),
            'total_classrooms' => $academicYear->students()->distinct('classroom_id')->count('classroom_id'),
        ];

        return $this->success($stats);
    }
}
