<?php

namespace App\Http\Controllers;

use App\Actions\CreateQuestionBankTopicAction;
use App\Http\Requests\StoreQuestionBankTopicRequest;
use App\Http\Resources\QuestionBankTopicResource;
use App\Models\QuestionBankTopic;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class QuestionBankTopicController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of question bank topics.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionBankTopic::class);

        $query = QuestionBankTopic::with(['lesson', 'creator', 'questions']);

        // Filtreleme
        if (request()->has('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        // Sıralama
        $query->orderBy('order')
            ->orderBy('name');

        $topics = $query->paginate(request('per_page', 50));

        return $this->success([
            'topics' => QuestionBankTopicResource::collection($topics),
            'pagination' => [
                'current_page' => $topics->currentPage(),
                'last_page' => $topics->lastPage(),
                'per_page' => $topics->perPage(),
                'total' => $topics->total(),
            ],
        ], 'Soru havuzu konuları başarıyla listelendi.');
    }

    /**
     * Store a newly created question bank topic.
     */
    public function store(StoreQuestionBankTopicRequest $request, CreateQuestionBankTopicAction $action): JsonResponse
    {
        Gate::authorize('create', QuestionBankTopic::class);

        try {
            $topic = $action->execute($request->validated());

            return $this->success(new QuestionBankTopicResource($topic), 'Soru havuzu konusu başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified question bank topic.
     */
    public function show(QuestionBankTopic $questionBankTopic): JsonResponse
    {
        Gate::authorize('view', $questionBankTopic);

        $questionBankTopic->load(['lesson', 'creator', 'questions']);

        return $this->success(new QuestionBankTopicResource($questionBankTopic));
    }

    /**
     * Update the specified question bank topic.
     */
    public function update(StoreQuestionBankTopicRequest $request, QuestionBankTopic $questionBankTopic): JsonResponse
    {
        Gate::authorize('update', $questionBankTopic);

        try {
            $questionBankTopic->update($request->validated());
            $this->activityLogService->logUpdate($questionBankTopic);

            return $this->success(new QuestionBankTopicResource($questionBankTopic->fresh()), 'Soru havuzu konusu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified question bank topic.
     */
    public function destroy(QuestionBankTopic $questionBankTopic): JsonResponse
    {
        Gate::authorize('delete', $questionBankTopic);

        // Konuya ait sorular varsa silinemez
        if ($questionBankTopic->questions()->count() > 0) {
            return $this->error('Bu konuya ait sorular bulunmaktadır. Önce soruları silin veya başka bir konuya taşıyın.', [], 400);
        }

        $this->activityLogService->logDelete($questionBankTopic);
        $questionBankTopic->delete();

        return $this->success(null, 'Soru havuzu konusu başarıyla silindi.');
    }
}
