<?php

namespace App\Http\Controllers;

use App\Actions\CreateActivityAction;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Requests\StoreActivityParticipantRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\ActivityParticipantResource;
use App\Models\Activity;
use App\Models\ActivityParticipant;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class ActivityController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of activities (social media feed).
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Activity::class);

        $query = Activity::with(['classroom', 'creator', 'participants.student', 'participants.user']);

        // Filtreleme
        if (request()->has('category')) {
            $query->where('category', request('category'));
        }

        if (request()->has('activity_date_from')) {
            $query->where('activity_date', '>=', request('activity_date_from'));
        }

        if (request()->has('activity_date_to')) {
            $query->where('activity_date', '<=', request('activity_date_to'));
        }

        if (request()->has('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }

        if (request()->has('student_id')) {
            $studentId = request('student_id');
            $query->where(function ($q) use ($studentId) {
                $q->where('share_type', 'all')
                    ->orWhere('share_type', 'single_student')
                    ->whereJsonContains('target_student_ids', $studentId)
                    ->orWhere('share_type', 'target_group')
                    ->where(function ($subQ) use ($studentId) {
                        $subQ->whereJsonContains('target_student_ids', $studentId)
                            ->orWhereHas('classroom', function ($classQ) use ($studentId) {
                                $classQ->whereHas('students', function ($studentQ) use ($studentId) {
                                    $studentQ->where('students.id', $studentId);
                                });
                            });
                    });
            });
        }

        // Sadece yayınlanmış etkinlikler
        if (request()->has('published_only') || !auth()->user()->hasPermission('admin')) {
            $query->where('is_published', true)
                ->where(function ($q) {
                    $q->where('requires_admin_approval', false)
                        ->orWhere('is_admin_approved', true);
                });
        }

        // Sıralama
        $query->orderBy('activity_date', 'desc')
            ->orderBy('activity_time', 'desc');

        $activities = $query->paginate(request('per_page', 20));

        return $this->success([
            'activities' => ActivityResource::collection($activities),
            'pagination' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ], 'Etkinlikler başarıyla listelendi.');
    }

    /**
     * Store a newly created activity.
     */
    public function store(StoreActivityRequest $request, CreateActivityAction $action): JsonResponse
    {
        Gate::authorize('create', Activity::class);

        try {
            $activity = $action->execute($request->validated());

            return $this->success(new ActivityResource($activity), 'Etkinlik başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified activity.
     */
    public function show(Activity $activity): JsonResponse
    {
        Gate::authorize('view', $activity);

        // Görüntülenme sayısını artır
        $activity->incrementViewCount();

        $activity->load(['classroom', 'creator', 'participants.student', 'participants.user', 'approver']);

        return $this->success(new ActivityResource($activity));
    }

    /**
     * Update the specified activity.
     */
    public function update(StoreActivityRequest $request, Activity $activity): JsonResponse
    {
        Gate::authorize('update', $activity);

        try {
            $activity->update($request->validated());
            $this->activityLogService->logUpdate($activity);

            return $this->success(new ActivityResource($activity->fresh()), 'Etkinlik başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified activity.
     */
    public function destroy(Activity $activity): JsonResponse
    {
        Gate::authorize('delete', $activity);

        $this->activityLogService->logDelete($activity);
        $activity->delete();

        return $this->success(null, 'Etkinlik başarıyla silindi.');
    }

    /**
     * Approve activity (admin).
     */
    public function approve(Activity $activity): JsonResponse
    {
        Gate::authorize('update', $activity);

        if (!$activity->requires_admin_approval) {
            return $this->error('Bu etkinlik idare onayı gerektirmiyor.', [], 400);
        }

        if ($activity->is_admin_approved) {
            return $this->error('Bu etkinlik zaten onaylanmış.', [], 400);
        }

        $activity->update([
            'is_admin_approved' => true,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        $this->activityLogService->logUpdate($activity);

        return $this->success(new ActivityResource($activity->fresh()), 'Etkinlik başarıyla onaylandı.');
    }

    /**
     * Like activity.
     */
    public function like(Activity $activity): JsonResponse
    {
        Gate::authorize('view', $activity);

        $activity->incrementLikeCount();

        return $this->success(new ActivityResource($activity->fresh()), 'Etkinlik beğenildi.');
    }

    /**
     * Add participant to activity.
     */
    public function addParticipant(StoreActivityParticipantRequest $request): JsonResponse
    {
        $activity = Activity::findOrFail($request->activity_id);
        Gate::authorize('update', $activity);

        try {
            $participant = ActivityParticipant::create($request->validated());
            $this->activityLogService->logCreate($participant);

            return $this->success(new ActivityParticipantResource($participant->load(['student', 'user'])), 'Katılımcı başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove participant from activity.
     */
    public function removeParticipant(ActivityParticipant $activityParticipant): JsonResponse
    {
        Gate::authorize('update', $activityParticipant->activity);

        $this->activityLogService->logDelete($activityParticipant);
        $activityParticipant->delete();

        return $this->success(null, 'Katılımcı başarıyla çıkarıldı.');
    }

    /**
     * Get activity statistics.
     */
    public function getStatistics(): JsonResponse
    {
        Gate::authorize('viewAny', Activity::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $totalActivities = Activity::whereBetween('activity_date', [$dateFrom, $dateTo])->count();
        $publishedActivities = Activity::whereBetween('activity_date', [$dateFrom, $dateTo])
            ->where('is_published', true)
            ->count();
        $pendingApproval = Activity::where('requires_admin_approval', true)
            ->where('is_admin_approved', false)
            ->count();

        $byCategory = Activity::whereBetween('activity_date', [$dateFrom, $dateTo])
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category');

        $totalViews = Activity::whereBetween('activity_date', [$dateFrom, $dateTo])
            ->sum('view_count');

        $totalLikes = Activity::whereBetween('activity_date', [$dateFrom, $dateTo])
            ->sum('like_count');

        return $this->success([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_activities' => $totalActivities,
            'published_activities' => $publishedActivities,
            'pending_approval' => $pendingApproval,
            'by_category' => $byCategory,
            'total_views' => $totalViews,
            'total_likes' => $totalLikes,
        ], 'Etkinlik istatistikleri başarıyla getirildi.');
    }
}
