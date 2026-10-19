<?php

namespace App\Http\Controllers;

use App\Actions\CreateCurriculumTrackingAction;
use App\Http\Requests\StoreCurriculumTrackingRequest;
use App\Http\Resources\CurriculumTrackingResource;
use App\Models\CurriculumTracking;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class CurriculumTrackingController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of curriculum tracking records.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', CurriculumTracking::class);

        $query = CurriculumTracking::with(['lesson', 'classroom', 'teacher', 'creator']);

        // Filtreleme
        if (request()->has('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }

        if (request()->has('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }

        if (request()->has('teacher_id')) {
            $query->where('teacher_id', request('teacher_id'));
        }

        if (request()->has('teaching_date_from')) {
            $query->where('teaching_date', '>=', request('teaching_date_from'));
        }

        if (request()->has('teaching_date_to')) {
            $query->where('teaching_date', '<=', request('teaching_date_to'));
        }

        if (request()->has('is_completed')) {
            $query->where('is_completed', request('is_completed'));
        }

        // Sıralama
        $query->orderBy('teaching_date', 'desc')
            ->orderBy('created_at', 'desc');

        $trackings = $query->paginate(request('per_page', 50));

        return $this->success([
            'trackings' => CurriculumTrackingResource::collection($trackings),
            'pagination' => [
                'current_page' => $trackings->currentPage(),
                'last_page' => $trackings->lastPage(),
                'per_page' => $trackings->perPage(),
                'total' => $trackings->total(),
            ],
        ], 'Müfredat takip kayıtları başarıyla listelendi.');
    }

    /**
     * Store a newly created curriculum tracking record.
     */
    public function store(StoreCurriculumTrackingRequest $request, CreateCurriculumTrackingAction $action): JsonResponse
    {
        Gate::authorize('create', CurriculumTracking::class);

        try {
            $tracking = $action->execute($request->validated());

            return $this->success(new CurriculumTrackingResource($tracking), 'Müfredat takip kaydı başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified curriculum tracking record.
     */
    public function show(CurriculumTracking $curriculumTracking): JsonResponse
    {
        Gate::authorize('view', $curriculumTracking);

        $curriculumTracking->load(['lesson', 'classroom', 'teacher', 'creator']);

        return $this->success(new CurriculumTrackingResource($curriculumTracking));
    }

    /**
     * Update the specified curriculum tracking record.
     */
    public function update(StoreCurriculumTrackingRequest $request, CurriculumTracking $curriculumTracking): JsonResponse
    {
        Gate::authorize('update', $curriculumTracking);

        try {
            $curriculumTracking->update($request->validated());
            $this->activityLogService->logUpdate($curriculumTracking);

            return $this->success(new CurriculumTrackingResource($curriculumTracking->fresh()), 'Müfredat takip kaydı başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified curriculum tracking record.
     */
    public function destroy(CurriculumTracking $curriculumTracking): JsonResponse
    {
        Gate::authorize('delete', $curriculumTracking);

        $this->activityLogService->logDelete($curriculumTracking);
        $curriculumTracking->delete();

        return $this->success(null, 'Müfredat takip kaydı başarıyla silindi.');
    }

    /**
     * Get classroom-level curriculum tracking list.
     */
    public function getClassroomList(int $classroomId): JsonResponse
    {
        Gate::authorize('viewAny', CurriculumTracking::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $trackings = CurriculumTracking::where('classroom_id', $classroomId)
            ->whereBetween('teaching_date', [$dateFrom, $dateTo])
            ->with(['lesson', 'teacher'])
            ->orderBy('teaching_date', 'desc')
            ->orderBy('lesson_id')
            ->get()
            ->groupBy('lesson_id')
            ->map(function ($group) {
                return [
                    'lesson' => new \App\Http\Resources\LessonResource($group->first()->lesson),
                    'topics' => $group->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'topic' => $item->topic,
                            'teaching_date' => $item->teaching_date->format('Y-m-d'),
                            'lesson_hour' => $item->lesson_hour,
                            'teacher' => [
                                'id' => $item->teacher->id,
                                'name' => $item->teacher->name,
                            ],
                        ];
                    })->values(),
                ];
            })
            ->values();

        return $this->success($trackings, 'Sınıf bazlı müfredat takip listesi başarıyla getirildi.');
    }

    /**
     * Get teacher-level curriculum tracking list.
     */
    public function getTeacherList(int $teacherId): JsonResponse
    {
        Gate::authorize('viewAny', CurriculumTracking::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $trackings = CurriculumTracking::where('teacher_id', $teacherId)
            ->whereBetween('teaching_date', [$dateFrom, $dateTo])
            ->with(['lesson', 'classroom'])
            ->orderBy('teaching_date', 'desc')
            ->orderBy('lesson_id')
            ->get()
            ->groupBy('lesson_id')
            ->map(function ($group) {
                return [
                    'lesson' => new \App\Http\Resources\LessonResource($group->first()->lesson),
                    'topics' => $group->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'topic' => $item->topic,
                            'teaching_date' => $item->teaching_date->format('Y-m-d'),
                            'lesson_hour' => $item->lesson_hour,
                            'classroom' => $item->classroom ? [
                                'id' => $item->classroom->id,
                                'name' => $item->classroom->name,
                            ] : null,
                        ];
                    })->values(),
                ];
            })
            ->values();

        return $this->success($trackings, 'Öğretmen bazlı müfredat takip listesi başarıyla getirildi.');
    }

    /**
     * Compare curriculum tracking between classrooms.
     */
    public function compareClassrooms(): JsonResponse
    {
        Gate::authorize('viewAny', CurriculumTracking::class);

        $classroomIds = request('classroom_ids', []);
        $lessonId = request('lesson_id');
        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        if (empty($classroomIds) || !is_array($classroomIds)) {
            return $this->error('Sınıf ID\'leri gereklidir.', [], 400);
        }

        $query = CurriculumTracking::whereIn('classroom_id', $classroomIds)
            ->whereBetween('teaching_date', [$dateFrom, $dateTo]);

        if ($lessonId) {
            $query->where('lesson_id', $lessonId);
        }

        $trackings = $query->with(['lesson', 'classroom', 'teacher'])
            ->get()
            ->groupBy('classroom_id')
            ->map(function ($group, $classroomId) {
                $classroom = $group->first()->classroom;
                return [
                    'classroom' => [
                        'id' => $classroom->id,
                        'name' => $classroom->name,
                    ],
                    'total_topics' => $group->count(),
                    'total_hours' => $group->sum('lesson_hour'),
                    'topics' => $group->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'topic' => $item->topic,
                            'teaching_date' => $item->teaching_date->format('Y-m-d'),
                            'lesson_hour' => $item->lesson_hour,
                            'lesson' => [
                                'id' => $item->lesson->id,
                                'name' => $item->lesson->name,
                            ],
                        ];
                    })->values(),
                ];
            })
            ->values();

        return $this->success([
            'classrooms' => $trackings,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
        ], 'Sınıflar arası müfredat karşılaştırması başarıyla getirildi.');
    }

    /**
     * Get topic and lesson hour report.
     */
    public function getTopicReport(): JsonResponse
    {
        Gate::authorize('viewAny', CurriculumTracking::class);

        $lessonId = request('lesson_id');
        $classroomId = request('classroom_id');
        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $query = CurriculumTracking::whereBetween('teaching_date', [$dateFrom, $dateTo]);

        if ($lessonId) {
            $query->where('lesson_id', $lessonId);
        }

        if ($classroomId) {
            $query->where('classroom_id', $classroomId);
        }

        $report = $query->selectRaw('
                topic,
                COUNT(*) as topic_count,
                SUM(lesson_hour) as total_hours,
                MIN(teaching_date) as first_taught,
                MAX(teaching_date) as last_taught
            ')
            ->groupBy('topic')
            ->orderBy('first_taught')
            ->get()
            ->map(function ($item) {
                return [
                    'topic' => $item->topic,
                    'topic_count' => $item->topic_count,
                    'total_hours' => $item->total_hours,
                    'first_taught' => $item->first_taught?->format('Y-m-d'),
                    'last_taught' => $item->last_taught?->format('Y-m-d'),
                ];
            });

        return $this->success([
            'report' => $report,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
        ], 'Konu ve ders saati raporu başarıyla getirildi.');
    }
}
