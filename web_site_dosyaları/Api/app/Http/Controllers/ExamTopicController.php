<?php

namespace App\Http\Controllers;

use App\Actions\CreateExamTopicAction;
use App\Http\Requests\StoreExamTopicRequest;
use App\Models\ExamTopic;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ExamTopicController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of exam topics.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ExamTopic::class);

        $query = ExamTopic::with(['exam']);

        if (request()->has('exam_id')) {
            $query->where('exam_id', request('exam_id'));
        }

        $query->orderBy('sort_order', 'asc');

        $topics = $query->paginate(request('per_page', 50));

        return $this->paginated($topics, []);
    }

    /**
     * Store a newly created exam topic.
     */
    public function store(StoreExamTopicRequest $request, CreateExamTopicAction $createExamTopicAction): JsonResponse
    {
        Gate::authorize('create', ExamTopic::class);

        $topic = $createExamTopicAction->execute($request->validated());

        return $this->success([
            'topic' => [
                'id' => $topic->id,
                'exam_id' => $topic->exam_id,
                'topic_name' => $topic->topic_name,
                'question_count' => $topic->question_count,
                'total_points' => $topic->total_points,
            ],
        ], 'Sınav konusu başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified exam topic.
     */
    public function show(ExamTopic $topic): JsonResponse
    {
        Gate::authorize('view', $topic);

        return $this->success([
            'topic' => [
                'id' => $topic->id,
                'exam_id' => $topic->exam_id,
                'topic_name' => $topic->topic_name,
                'question_count' => $topic->question_count,
                'total_points' => $topic->total_points,
                'sort_order' => $topic->sort_order,
            ],
        ]);
    }

    /**
     * Remove the specified exam topic.
     */
    public function destroy(ExamTopic $topic): JsonResponse
    {
        Gate::authorize('delete', $topic);

        $this->activityLogService->logDelete($topic);
        $topic->delete();

        return $this->success(null, 'Sınav konusu başarıyla silindi.');
    }
}
