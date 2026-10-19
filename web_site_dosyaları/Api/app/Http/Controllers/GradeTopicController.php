<?php

namespace App\Http\Controllers;

use App\Actions\CreateGradeTopicAction;
use App\Http\Requests\StoreGradeTopicRequest;
use App\Models\GradeTopic;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GradeTopicController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of grade topics.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', GradeTopic::class);

        $query = GradeTopic::with(['grade']);

        if (request()->has('grade_id')) {
            $query->where('grade_id', request('grade_id'));
        }

        $query->orderBy('sort_order', 'asc');

        $topics = $query->paginate(request('per_page', 50));

        return $this->paginated($topics, []);
    }

    /**
     * Store a newly created grade topic.
     */
    public function store(StoreGradeTopicRequest $request, CreateGradeTopicAction $createGradeTopicAction): JsonResponse
    {
        Gate::authorize('create', GradeTopic::class);

        $topic = $createGradeTopicAction->execute($request->validated());

        return $this->success([
            'topic' => [
                'id' => $topic->id,
                'grade_id' => $topic->grade_id,
                'topic_name' => $topic->topic_name,
                'question_count' => $topic->question_count,
                'points' => $topic->points,
            ],
        ], 'Not konusu başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified grade topic.
     */
    public function show(GradeTopic $topic): JsonResponse
    {
        Gate::authorize('view', $topic);

        return $this->success([
            'topic' => [
                'id' => $topic->id,
                'grade_id' => $topic->grade_id,
                'topic_name' => $topic->topic_name,
                'question_number' => $topic->question_number,
                'question_count' => $topic->question_count,
                'points' => $topic->points,
                'sort_order' => $topic->sort_order,
            ],
        ]);
    }

    /**
     * Remove the specified grade topic.
     */
    public function destroy(GradeTopic $topic): JsonResponse
    {
        Gate::authorize('delete', $topic);

        $this->activityLogService->logDelete($topic);
        $topic->delete();

        return $this->success(null, 'Not konusu başarıyla silindi.');
    }
}
