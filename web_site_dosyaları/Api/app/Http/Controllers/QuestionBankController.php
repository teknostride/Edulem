<?php

namespace App\Http\Controllers;

use App\Actions\CreateQuestionBankAction;
use App\Http\Requests\StoreQuestionBankRequest;
use App\Http\Resources\QuestionBankResource;
use App\Models\QuestionBank;
use App\Services\ActivityLogService;
use App\Services\QuestionBankService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class QuestionBankController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected QuestionBankService $questionBankService;

    public function __construct(
        ActivityLogService $activityLogService,
        QuestionBankService $questionBankService
    ) {
        $this->activityLogService = $activityLogService;
        $this->questionBankService = $questionBankService;
    }

    /**
     * Display a listing of question bank entries.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionBank::class);

        $query = QuestionBank::with(['topic', 'lesson', 'creator']);

        // Filtreleme
        if (request()->has('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }

        if (request()->has('topic_id')) {
            $query->where('question_bank_topic_id', request('topic_id'));
        }

        if (request()->has('question_type')) {
            $query->where('question_type', request('question_type'));
        }

        if (request()->has('difficulty_level')) {
            $query->where('difficulty_level', request('difficulty_level'));
        }

        if (request()->has('school_type')) {
            $query->where('school_type', request('school_type'));
        }

        if (request()->has('grade_level')) {
            $query->where('grade_level', request('grade_level'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        if (request()->has('is_public')) {
            $query->where('is_public', request('is_public'));
        }

        if (request()->has('search')) {
            $query->whereFullText('question_text', request('search'));
        }

        if (request()->has('exclude_used_recently')) {
            $days = request('exclude_days', 30);
            $query->where(function ($q) use ($days) {
                $q->whereNull('last_used_at')
                    ->orWhereRaw("DATEDIFF(NOW(), last_used_at) > ?", [$days]);
            });
        }

        // Sıralama
        $sortBy = request('sort_by', 'created_at');
        $sortOrder = request('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $questions = $query->paginate(request('per_page', 50));

        return $this->success([
            'questions' => QuestionBankResource::collection($questions),
            'pagination' => [
                'current_page' => $questions->currentPage(),
                'last_page' => $questions->lastPage(),
                'per_page' => $questions->perPage(),
                'total' => $questions->total(),
            ],
        ], 'Soru havuzu başarıyla listelendi.');
    }

    /**
     * Store a newly created question bank entry.
     */
    public function store(StoreQuestionBankRequest $request, CreateQuestionBankAction $action): JsonResponse
    {
        Gate::authorize('create', QuestionBank::class);

        try {
            $question = $action->execute($request->validated());

            return $this->success(new QuestionBankResource($question), 'Soru başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified question bank entry.
     */
    public function show(QuestionBank $questionBank): JsonResponse
    {
        Gate::authorize('view', $questionBank);

        $questionBank->load(['topic', 'lesson', 'creator', 'usageHistory']);

        return $this->success(new QuestionBankResource($questionBank));
    }

    /**
     * Update the specified question bank entry.
     */
    public function update(StoreQuestionBankRequest $request, QuestionBank $questionBank): JsonResponse
    {
        Gate::authorize('update', $questionBank);

        try {
            $questionBank->update($request->validated());
            $this->activityLogService->logUpdate($questionBank);

            return $this->success(new QuestionBankResource($questionBank->fresh()), 'Soru başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified question bank entry.
     */
    public function destroy(QuestionBank $questionBank): JsonResponse
    {
        Gate::authorize('delete', $questionBank);

        $this->activityLogService->logDelete($questionBank);
        $questionBank->delete();

        return $this->success(null, 'Soru başarıyla silindi.');
    }

    /**
     * Prepare booklet questions.
     */
    public function prepareBooklet(): JsonResponse
    {
        Gate::authorize('create', QuestionBank::class);

        try {
            $criteria = request('criteria', []);

            if (empty($criteria)) {
                return $this->error('Kriterler belirtilmelidir.', [], 400);
            }

            $questions = $this->questionBankService->prepareBookletQuestions($criteria);

            return $this->success([
                'questions' => QuestionBankResource::collection(collect($questions)),
                'total_count' => count($questions),
            ], 'Kitapçık soruları başarıyla hazırlandı.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Prepare practice test questions.
     */
    public function preparePracticeTest(): JsonResponse
    {
        Gate::authorize('create', QuestionBank::class);

        try {
            $criteria = request()->validate([
                'total_questions' => ['required', 'integer', 'min:1'],
                'difficulty_distribution' => ['nullable', 'array'],
                'difficulty_distribution.easy' => ['nullable', 'numeric', 'min:0', 'max:1'],
                'difficulty_distribution.medium' => ['nullable', 'numeric', 'min:0', 'max:1'],
                'difficulty_distribution.hard' => ['nullable', 'numeric', 'min:0', 'max:1'],
                'difficulty_distribution.very_hard' => ['nullable', 'numeric', 'min:0', 'max:1'],
                'filters' => ['nullable', 'array'],
            ]);

            $questions = $this->questionBankService->preparePracticeTestQuestions($criteria);

            return $this->success([
                'questions' => QuestionBankResource::collection(collect($questions)),
                'total_count' => count($questions),
            ], 'Deneme sınavı soruları başarıyla hazırlandı.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Prepare topic test questions.
     */
    public function prepareTopicTest(): JsonResponse
    {
        Gate::authorize('create', QuestionBank::class);

        try {
            request()->validate([
                'topic_id' => ['required', 'exists:question_bank_topics,id'],
                'count' => ['required', 'integer', 'min:1'],
                'difficulty_level' => ['nullable', 'in:easy,medium,hard,very_hard'],
                'question_type' => ['nullable', 'in:multiple_choice,true_false,fill_in_blank,short_answer,essay,matching,ordering'],
            ]);

            $questions = $this->questionBankService->prepareTopicTestQuestions(
                request('topic_id'),
                request('count'),
                request()->only(['difficulty_level', 'question_type', 'lesson_id'])
            );

            return $this->success([
                'questions' => QuestionBankResource::collection(collect($questions)),
                'total_count' => count($questions),
            ], 'Konu testi soruları başarıyla hazırlandı.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Check question reuse.
     */
    public function checkReuse(QuestionBank $questionBank): JsonResponse
    {
        Gate::authorize('view', $questionBank);

        $days = request('days', 30);
        $canReuse = $this->questionBankService->canReuseQuestion($questionBank->id, $days);

        return $this->success([
            'question_id' => $questionBank->id,
            'can_reuse' => $canReuse,
            'last_used_at' => $questionBank->last_used_at?->format('Y-m-d'),
            'usage_count' => $questionBank->usage_count,
            'days' => $days,
        ], 'Soru yeniden kullanım kontrolü yapıldı.');
    }

    /**
     * Get question statistics.
     */
    public function getStatistics(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionBank::class);

        $filters = request()->only(['lesson_id', 'topic_id']);
        $statistics = $this->questionBankService->getQuestionStatistics($filters);

        return $this->success($statistics, 'Soru havuzu istatistikleri başarıyla getirildi.');
    }

    /**
     * Record question usage.
     */
    public function recordUsage(QuestionBank $questionBank): JsonResponse
    {
        Gate::authorize('update', $questionBank);

        try {
            request()->validate([
                'usage_type' => ['required', 'in:exam,homework,booklet,online_exam,practice_test,other'],
                'related_id' => ['nullable', 'integer'],
            ]);

            $questionBank->recordUsage(
                request('usage_type'),
                request('related_id')
            );

            return $this->success(new QuestionBankResource($questionBank->fresh()), 'Soru kullanımı başarıyla kaydedildi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }
}
