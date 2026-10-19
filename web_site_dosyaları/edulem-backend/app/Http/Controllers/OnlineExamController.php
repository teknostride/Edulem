<?php

namespace App\Http\Controllers;

use App\Actions\CreateOnlineExamAction;
use App\Http\Requests\StoreOnlineExamRequest;
use App\Http\Requests\StartOnlineExamAttemptRequest;
use App\Http\Requests\SaveOnlineExamAnswerRequest;
use App\Http\Resources\OnlineExamResource;
use App\Http\Resources\OnlineExamAttemptResource;
use App\Http\Resources\OnlineExamAnswerResource;
use App\Models\OnlineExam;
use App\Models\OnlineExamAttempt;
use App\Models\Student;
use App\Services\ActivityLogService;
use App\Services\OnlineExamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class OnlineExamController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected OnlineExamService $onlineExamService;

    public function __construct(
        ActivityLogService $activityLogService,
        OnlineExamService $onlineExamService
    ) {
        $this->activityLogService = $activityLogService;
        $this->onlineExamService = $onlineExamService;
    }

    /**
     * Display a listing of online exams.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', OnlineExam::class);

        $query = OnlineExam::with(['lesson', 'classroom', 'creator']);

        // Filtreleme
        if (request()->has('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }

        if (request()->has('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('student_id')) {
            $studentId = request('student_id');
            $query->where(function ($q) use ($studentId) {
                $q->where('classroom_id', function ($subQuery) use ($studentId) {
                    $subQuery->select('classroom_id')
                        ->from('students')
                        ->where('id', $studentId);
                })
                ->orWhereNull('classroom_id');
            });
        }

        // Sıralama
        $query->orderBy('start_time', 'desc');

        $exams = $query->paginate(request('per_page', 50));

        return $this->success([
            'exams' => OnlineExamResource::collection($exams),
            'pagination' => [
                'current_page' => $exams->currentPage(),
                'last_page' => $exams->lastPage(),
                'per_page' => $exams->perPage(),
                'total' => $exams->total(),
            ],
        ], 'Online sınavlar başarıyla listelendi.');
    }

    /**
     * Store a newly created online exam.
     */
    public function store(StoreOnlineExamRequest $request, CreateOnlineExamAction $action): JsonResponse
    {
        Gate::authorize('create', OnlineExam::class);

        try {
            $exam = $action->execute($request->validated());

            return $this->success(new OnlineExamResource($exam), 'Online sınav başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified online exam.
     */
    public function show(OnlineExam $onlineExam): JsonResponse
    {
        Gate::authorize('view', $onlineExam);

        $onlineExam->load(['lesson', 'classroom', 'creator', 'attempts.student']);

        return $this->success(new OnlineExamResource($onlineExam));
    }

    /**
     * Update the specified online exam.
     */
    public function update(StoreOnlineExamRequest $request, OnlineExam $onlineExam): JsonResponse
    {
        Gate::authorize('update', $onlineExam);

        try {
            $onlineExam->update($request->validated());
            $this->activityLogService->logUpdate($onlineExam);

            return $this->success(new OnlineExamResource($onlineExam->fresh()), 'Online sınav başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified online exam.
     */
    public function destroy(OnlineExam $onlineExam): JsonResponse
    {
        Gate::authorize('delete', $onlineExam);

        $this->activityLogService->logDelete($onlineExam);
        $onlineExam->delete();

        return $this->success(null, 'Online sınav başarıyla silindi.');
    }

    /**
     * Start an exam attempt.
     */
    public function startAttempt(OnlineExam $onlineExam, StartOnlineExamAttemptRequest $request): JsonResponse
    {
        Gate::authorize('view', $onlineExam);

        try {
            $student = Student::findOrFail($request->student_id);
            $attempt = $this->onlineExamService->startAttempt($onlineExam, $student);

            return $this->success(new OnlineExamAttemptResource($attempt), 'Sınav başlatıldı.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get current attempt for student.
     */
    public function getCurrentAttempt(OnlineExam $onlineExam, int $studentId): JsonResponse
    {
        Gate::authorize('view', $onlineExam);

        $attempt = OnlineExamAttempt::where('online_exam_id', $onlineExam->id)
            ->where('student_id', $studentId)
            ->where('status', 'in_progress')
            ->with(['answers', 'student'])
            ->first();

        if (!$attempt) {
            return $this->error('Devam eden sınav bulunamadı.', [], 404);
        }

        return $this->success(new OnlineExamAttemptResource($attempt));
    }

    /**
     * Save answer for a question.
     */
    public function saveAnswer(OnlineExamAttempt $onlineExamAttempt, SaveOnlineExamAnswerRequest $request): JsonResponse
    {
        Gate::authorize('view', $onlineExamAttempt->onlineExam);

        try {
            $answer = $this->onlineExamService->saveAnswer(
                $onlineExamAttempt,
                $request->question_id,
                $request->answer,
                $request->time_spent_seconds ?? 0
            );

            return $this->success(new OnlineExamAnswerResource($answer), 'Cevap kaydedildi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Submit exam attempt.
     */
    public function submitAttempt(OnlineExamAttempt $onlineExamAttempt): JsonResponse
    {
        Gate::authorize('view', $onlineExamAttempt->onlineExam);

        try {
            $attempt = $this->onlineExamService->submitAttempt($onlineExamAttempt);

            return $this->success(new OnlineExamAttemptResource($attempt), 'Sınav başarıyla gönderildi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get real-time statistics.
     */
    public function getRealTimeStatistics(OnlineExam $onlineExam): JsonResponse
    {
        Gate::authorize('view', $onlineExam);

        $statistics = $this->onlineExamService->getRealTimeStatistics($onlineExam);

        return $this->success($statistics, 'Anlık istatistikler başarıyla getirildi.');
    }

    /**
     * Get student attempts.
     */
    public function getStudentAttempts(OnlineExam $onlineExam, int $studentId): JsonResponse
    {
        Gate::authorize('view', $onlineExam);

        $attempts = OnlineExamAttempt::where('online_exam_id', $onlineExam->id)
            ->where('student_id', $studentId)
            ->with(['answers'])
            ->orderBy('started_at', 'desc')
            ->get();

        return $this->success(OnlineExamAttemptResource::collection($attempts), 'Öğrenci denemeleri başarıyla getirildi.');
    }

    /**
     * Auto-submit expired attempts (for scheduled job).
     */
    public function autoSubmitExpired(): JsonResponse
    {
        Gate::authorize('viewAny', OnlineExam::class);

        $count = $this->onlineExamService->autoSubmitExpiredAttempts();

        return $this->success(['count' => $count], "{$count} sınav otomatik olarak gönderildi.");
    }
}
