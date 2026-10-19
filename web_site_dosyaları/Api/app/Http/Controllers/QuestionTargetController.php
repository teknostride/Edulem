<?php

namespace App\Http\Controllers;

use App\Actions\CreateQuestionTargetAction;
use App\Actions\CreateStudentQuestionCountAction;
use App\Http\Requests\StoreQuestionTargetRequest;
use App\Http\Requests\StoreStudentQuestionCountRequest;
use App\Http\Resources\QuestionTargetResource;
use App\Http\Resources\StudentQuestionCountResource;
use App\Http\Resources\StudentResource;
use App\Models\QuestionTarget;
use App\Models\StudentQuestionCount;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class QuestionTargetController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of question targets.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionTarget::class);

        $query = QuestionTarget::with(['student', 'creator']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('week_start_date')) {
            $query->where('week_start_date', request('week_start_date'));
        }

        if (request()->has('week_start_date_from')) {
            $query->where('week_start_date', '>=', request('week_start_date_from'));
        }

        if (request()->has('week_start_date_to')) {
            $query->where('week_start_date', '<=', request('week_start_date_to'));
        }

        // Sıralama
        $query->orderBy('week_start_date', 'desc');

        $targets = $query->paginate(request('per_page', 50));

        return $this->success([
            'targets' => QuestionTargetResource::collection($targets),
            'pagination' => [
                'current_page' => $targets->currentPage(),
                'last_page' => $targets->lastPage(),
                'per_page' => $targets->perPage(),
                'total' => $targets->total(),
            ],
        ], 'Hedef sorular başarıyla listelendi.');
    }

    /**
     * Store a newly created question target.
     */
    public function store(StoreQuestionTargetRequest $request, CreateQuestionTargetAction $action): JsonResponse
    {
        Gate::authorize('create', QuestionTarget::class);

        try {
            $target = $action->execute($request->validated());

            return $this->success(new QuestionTargetResource($target), 'Hedef soru başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified question target.
     */
    public function show(QuestionTarget $questionTarget): JsonResponse
    {
        Gate::authorize('view', $questionTarget);

        $questionTarget->load(['student', 'questionCounts.lesson', 'creator']);

        return $this->success(new QuestionTargetResource($questionTarget));
    }

    /**
     * Remove the specified question target.
     */
    public function destroy(QuestionTarget $questionTarget): JsonResponse
    {
        Gate::authorize('delete', $questionTarget);

        $this->activityLogService->logDelete($questionTarget);
        $questionTarget->delete();

        return $this->success(null, 'Hedef soru başarıyla silindi.');
    }

    /**
     * Record student question count.
     */
    public function recordCount(StoreStudentQuestionCountRequest $request, CreateStudentQuestionCountAction $action): JsonResponse
    {
        Gate::authorize('create', StudentQuestionCount::class);

        try {
            $count = $action->execute($request->validated());

            return $this->success(new StudentQuestionCountResource($count), 'Soru sayısı başarıyla kaydedildi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get student statistics.
     */
    public function studentStatistics(int $studentId): JsonResponse
    {
        Gate::authorize('viewAny', QuestionTarget::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        // Günlük toplam
        $daily = StudentQuestionCount::where('student_id', $studentId)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->selectRaw('date, SUM(count) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->date => $item->total];
            });

        // Haftalık toplam
        $weekly = StudentQuestionCount::where('student_id', $studentId)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->selectRaw('YEARWEEK(date, 1) as week, SUM(count) as total')
            ->groupBy('week')
            ->orderBy('week')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->week => $item->total];
            });

        // Aylık toplam
        $monthly = StudentQuestionCount::where('student_id', $studentId)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->selectRaw('YEAR(date) as year, MONTH(date) as month, SUM(count) as total')
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->mapWithKeys(function ($item) {
                return ["{$item->year}-{$item->month}" => $item->total];
            });

        // Hedef tamamlama yüzdesi
        $targets = QuestionTarget::where('student_id', $studentId)
            ->whereBetween('week_start_date', [$dateFrom, $dateTo])
            ->get()
            ->map(function ($target) {
                return [
                    'week_start_date' => $target->week_start_date->format('Y-m-d'),
                    'weekly_target' => $target->weekly_target,
                    'total_solved' => $target->getTotalSolved(),
                    'completion_percentage' => round($target->getCompletionPercentage(), 2),
                ];
            });

        return $this->success([
            'student_id' => $studentId,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'daily' => $daily,
            'weekly' => $weekly,
            'monthly' => $monthly,
            'targets' => $targets,
        ], 'Öğrenci istatistikleri başarıyla getirildi.');
    }

    /**
     * Get teacher statistics (all students).
     */
    public function teacherStatistics(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionTarget::class);

        $teacherId = auth()->id();
        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        // Öğretmenin sınıflarındaki öğrenciler
        $students = \App\Models\Student::whereHas('classroom', function ($query) use ($teacherId) {
            $query->where('teacher_id', $teacherId);
        })
            ->pluck('id');

        if ($students->isEmpty()) {
            return $this->success([
                'teacher_id' => $teacherId,
                'students' => [],
                'total_questions' => 0,
            ], 'Öğretmen istatistikleri başarıyla getirildi.');
        }

        // Toplam soru sayısı
        $totalQuestions = StudentQuestionCount::whereIn('student_id', $students)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->sum('count');

        // Öğrenci bazlı istatistikler
        $studentStats = StudentQuestionCount::whereIn('student_id', $students)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->selectRaw('student_id, SUM(count) as total')
            ->groupBy('student_id')
            ->with('student')
            ->get()
            ->map(function ($item) {
                return [
                    'student_id' => $item->student_id,
                    'student_name' => $item->student->name,
                    'total' => $item->total,
                ];
            });

        return $this->success([
            'teacher_id' => $teacherId,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_questions' => $totalQuestions,
            'students' => $studentStats,
        ], 'Öğretmen istatistikleri başarıyla getirildi.');
    }
}
