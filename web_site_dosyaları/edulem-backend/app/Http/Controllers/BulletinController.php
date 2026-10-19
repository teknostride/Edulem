<?php

namespace App\Http\Controllers;

use App\Actions\CreateBulletinAction;
use App\Http\Requests\StoreBulletinRequest;
use App\Http\Resources\BulletinResource;
use App\Models\Bulletin;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class BulletinController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of bulletins.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Bulletin::class);

        $query = Bulletin::with(['student', 'template', 'creator']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('template_id')) {
            $query->where('template_id', request('template_id'));
        }

        if (request()->has('bulletin_date_from')) {
            $query->where('bulletin_date', '>=', request('bulletin_date_from'));
        }

        if (request()->has('bulletin_date_to')) {
            $query->where('bulletin_date', '<=', request('bulletin_date_to'));
        }

        if (request()->has('published_only')) {
            $query->where('is_published_to_guardian', true);
        }

        if (request()->has('portfolio_only')) {
            $query->where('is_added_to_portfolio', true);
        }

        // Sıralama
        $query->orderBy('bulletin_date', 'desc')
            ->orderBy('created_at', 'desc');

        $bulletins = $query->paginate(request('per_page', 50));

        return $this->success([
            'bulletins' => BulletinResource::collection($bulletins),
            'pagination' => [
                'current_page' => $bulletins->currentPage(),
                'last_page' => $bulletins->lastPage(),
                'per_page' => $bulletins->perPage(),
                'total' => $bulletins->total(),
            ],
        ], 'Bültenler başarıyla listelendi.');
    }

    /**
     * Store a newly created bulletin.
     */
    public function store(StoreBulletinRequest $request, CreateBulletinAction $action): JsonResponse
    {
        Gate::authorize('create', Bulletin::class);

        try {
            $bulletin = $action->execute($request->validated());

            return $this->success(new BulletinResource($bulletin), 'Bülten başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified bulletin.
     */
    public function show(Bulletin $bulletin): JsonResponse
    {
        Gate::authorize('view', $bulletin);

        $bulletin->load(['student', 'template', 'creator']);

        return $this->success(new BulletinResource($bulletin));
    }

    /**
     * Update the specified bulletin.
     */
    public function update(StoreBulletinRequest $request, Bulletin $bulletin): JsonResponse
    {
        Gate::authorize('update', $bulletin);

        try {
            $bulletin->update($request->validated());
            $this->activityLogService->logUpdate($bulletin);

            return $this->success(new BulletinResource($bulletin->fresh()), 'Bülten başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified bulletin.
     */
    public function destroy(Bulletin $bulletin): JsonResponse
    {
        Gate::authorize('delete', $bulletin);

        $this->activityLogService->logDelete($bulletin);
        $bulletin->delete();

        return $this->success(null, 'Bülten başarıyla silindi.');
    }

    /**
     * Publish bulletin to guardian page.
     */
    public function publishToGuardian(Bulletin $bulletin): JsonResponse
    {
        Gate::authorize('update', $bulletin);

        $bulletin->update(['is_published_to_guardian' => true]);
        $this->activityLogService->logUpdate($bulletin);

        return $this->success(new BulletinResource($bulletin->fresh()), 'Bülten veli sayfasında yayınlandı.');
    }

    /**
     * Add bulletin to portfolio.
     */
    public function addToPortfolio(Bulletin $bulletin): JsonResponse
    {
        Gate::authorize('update', $bulletin);

        $bulletin->update(['is_added_to_portfolio' => true]);
        $this->activityLogService->logUpdate($bulletin);

        return $this->success(new BulletinResource($bulletin->fresh()), 'Bülten portfolyoya eklendi.');
    }

    /**
     * Get student portfolio (bulletins and certificates).
     */
    public function getStudentPortfolio($studentId): JsonResponse
    {
        Gate::authorize('viewAny', Bulletin::class);

        $bulletins = Bulletin::where('student_id', $studentId)
            ->where('is_added_to_portfolio', true)
            ->with(['template', 'creator'])
            ->orderBy('bulletin_date', 'desc')
            ->get();

        $certificates = \App\Models\AchievementCertificate::where('student_id', $studentId)
            ->where('is_added_to_portfolio', true)
            ->with(['file', 'creator'])
            ->orderBy('achievement_date', 'desc')
            ->get();

        return $this->success([
            'bulletins' => BulletinResource::collection($bulletins),
            'certificates' => \App\Http\Resources\AchievementCertificateResource::collection($certificates),
        ], 'Öğrenci portfolyosu başarıyla getirildi.');
    }
}
