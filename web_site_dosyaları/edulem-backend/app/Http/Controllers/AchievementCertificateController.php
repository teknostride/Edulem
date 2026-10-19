<?php

namespace App\Http\Controllers;

use App\Actions\CreateAchievementCertificateAction;
use App\Http\Requests\StoreAchievementCertificateRequest;
use App\Http\Resources\AchievementCertificateResource;
use App\Models\AchievementCertificate;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AchievementCertificateController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of achievement certificates.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', AchievementCertificate::class);

        $query = AchievementCertificate::with(['student', 'file', 'creator']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('certificate_type')) {
            $query->where('certificate_type', request('certificate_type'));
        }

        if (request()->has('achievement_date_from')) {
            $query->where('achievement_date', '>=', request('achievement_date_from'));
        }

        if (request()->has('achievement_date_to')) {
            $query->where('achievement_date', '<=', request('achievement_date_to'));
        }

        if (request()->has('published_only')) {
            $query->where('is_published_to_guardian', true);
        }

        if (request()->has('portfolio_only')) {
            $query->where('is_added_to_portfolio', true);
        }

        // Sıralama
        $query->orderBy('achievement_date', 'desc')
            ->orderBy('created_at', 'desc');

        $certificates = $query->paginate(request('per_page', 50));

        return $this->success([
            'certificates' => AchievementCertificateResource::collection($certificates),
            'pagination' => [
                'current_page' => $certificates->currentPage(),
                'last_page' => $certificates->lastPage(),
                'per_page' => $certificates->perPage(),
                'total' => $certificates->total(),
            ],
        ], 'Başarı belgeleri başarıyla listelendi.');
    }

    /**
     * Store a newly created achievement certificate.
     */
    public function store(StoreAchievementCertificateRequest $request, CreateAchievementCertificateAction $action): JsonResponse
    {
        Gate::authorize('create', AchievementCertificate::class);

        try {
            $certificate = $action->execute($request->validated());

            return $this->success(new AchievementCertificateResource($certificate), 'Başarı belgesi başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified achievement certificate.
     */
    public function show(AchievementCertificate $achievementCertificate): JsonResponse
    {
        Gate::authorize('view', $achievementCertificate);

        $achievementCertificate->load(['student', 'file', 'creator']);

        return $this->success(new AchievementCertificateResource($achievementCertificate));
    }

    /**
     * Update the specified achievement certificate.
     */
    public function update(StoreAchievementCertificateRequest $request, AchievementCertificate $achievementCertificate): JsonResponse
    {
        Gate::authorize('update', $achievementCertificate);

        try {
            $achievementCertificate->update($request->validated());
            $this->activityLogService->logUpdate($achievementCertificate);

            return $this->success(new AchievementCertificateResource($achievementCertificate->fresh()), 'Başarı belgesi başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified achievement certificate.
     */
    public function destroy(AchievementCertificate $achievementCertificate): JsonResponse
    {
        Gate::authorize('delete', $achievementCertificate);

        $this->activityLogService->logDelete($achievementCertificate);
        $achievementCertificate->delete();

        return $this->success(null, 'Başarı belgesi başarıyla silindi.');
    }

    /**
     * Publish certificate to guardian page.
     */
    public function publishToGuardian(AchievementCertificate $achievementCertificate): JsonResponse
    {
        Gate::authorize('update', $achievementCertificate);

        $achievementCertificate->update(['is_published_to_guardian' => true]);
        $this->activityLogService->logUpdate($achievementCertificate);

        return $this->success(new AchievementCertificateResource($achievementCertificate->fresh()), 'Başarı belgesi veli sayfasında yayınlandı.');
    }

    /**
     * Add certificate to portfolio.
     */
    public function addToPortfolio(AchievementCertificate $achievementCertificate): JsonResponse
    {
        Gate::authorize('update', $achievementCertificate);

        $achievementCertificate->update(['is_added_to_portfolio' => true]);
        $this->activityLogService->logUpdate($achievementCertificate);

        return $this->success(new AchievementCertificateResource($achievementCertificate->fresh()), 'Başarı belgesi portfolyoya eklendi.');
    }
}
