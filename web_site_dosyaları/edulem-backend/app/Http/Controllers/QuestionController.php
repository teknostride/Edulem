<?php

namespace App\Http\Controllers;

use App\Actions\CreateQuestionAction;
use App\Actions\UpdateQuestionAction;
use App\Http\Requests\StoreQuestionRequest;
use App\Http\Requests\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class QuestionController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of questions.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Question::class);

        $query = Question::with(['student', 'guardian', 'assignedUser', 'respondedBy']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('guardian_id')) {
            $query->where('guardian_id', request('guardian_id'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('assigned_to')) {
            $query->where('assigned_to', request('assigned_to'));
        }

        // Öğretmen filtreleme
        if (request()->has('teacher_id')) {
            $query->where('assigned_to', request('teacher_id'));
        }

        // Row-level security: Öğrenci sadece kendi sorularını görür
        $user = auth()->user();
        $role = $user->role ?? null;
        if ($role && $role->name === 'student') {
            $query->where('student_id', $user->id);
        }

        // Öğretmen sadece kendisine atanan soruları görür
        if ($role && $role->name === 'teacher') {
            $query->where('assigned_to', $user->id);
        }

        // Sıralama
        $query->latest('created_at');

        $questions = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Question::count(),
            'open' => Question::where('status', 'open')->count(),
            'in_progress' => Question::where('status', 'in_progress')->count(),
            'resolved' => Question::where('status', 'resolved')->count(),
            'closed' => Question::where('status', 'closed')->count(),
        ];

        return $this->success([
            'questions' => QuestionResource::collection($questions),
            'pagination' => [
                'current_page' => $questions->currentPage(),
                'last_page' => $questions->lastPage(),
                'per_page' => $questions->perPage(),
                'total' => $questions->total(),
            ],
            'statistics' => $stats,
        ], 'Sorular başarıyla listelendi.');
    }

    /**
     * Store a newly created question in storage.
     */
    public function store(StoreQuestionRequest $request, CreateQuestionAction $createQuestionAction): JsonResponse
    {
        Gate::authorize('create', Question::class);

        $question = $createQuestionAction->execute($request->validated());

        return $this->success(new QuestionResource($question), 'Soru başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified question.
     */
    public function show(Question $question): JsonResponse
    {
        Gate::authorize('view', $question);

        return $this->success(new QuestionResource($question->load(['student', 'guardian', 'assignedUser', 'respondedBy'])));
    }

    /**
     * Update the specified question in storage.
     */
    public function update(UpdateQuestionRequest $request, Question $question, UpdateQuestionAction $updateQuestionAction): JsonResponse
    {
        Gate::authorize('update', $question);

        $updatedQuestion = $updateQuestionAction->execute($question, $request->validated());

        return $this->success(new QuestionResource($updatedQuestion), 'Soru başarıyla güncellendi.');
    }

    /**
     * Remove the specified question from storage.
     */
    public function destroy(Question $question): JsonResponse
    {
        Gate::authorize('delete', $question);

        $this->activityLogService->logDelete($question);
        $question->delete();

        return $this->success(null, 'Soru başarıyla silindi.');
    }
}
