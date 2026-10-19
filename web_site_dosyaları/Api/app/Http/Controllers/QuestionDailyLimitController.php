<?php

namespace App\Http\Controllers;

use App\Actions\CreateQuestionDailyLimitAction;
use App\Http\Requests\StoreQuestionDailyLimitRequest;
use App\Models\QuestionDailyLimit;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class QuestionDailyLimitController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of question daily limits.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', QuestionDailyLimit::class);

        $query = QuestionDailyLimit::query();

        if (request()->has('user_type')) {
            $query->where('user_type', request('user_type'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        $limits = $query->paginate(request('per_page', 50));

        return $this->paginated($limits, []);
    }

    /**
     * Store a newly created question daily limit.
     */
    public function store(StoreQuestionDailyLimitRequest $request, CreateQuestionDailyLimitAction $createQuestionDailyLimitAction): JsonResponse
    {
        Gate::authorize('create', QuestionDailyLimit::class);

        $limit = $createQuestionDailyLimitAction->execute($request->validated());

        return $this->success([
            'limit' => [
                'id' => $limit->id,
                'user_type' => $limit->user_type,
                'daily_limit' => $limit->daily_limit,
                'is_active' => $limit->is_active,
            ],
        ], 'Günlük soru limiti başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified question daily limit.
     */
    public function show(QuestionDailyLimit $limit): JsonResponse
    {
        Gate::authorize('view', $limit);

        return $this->success([
            'limit' => [
                'id' => $limit->id,
                'user_type' => $limit->user_type,
                'daily_limit' => $limit->daily_limit,
                'is_active' => $limit->is_active,
            ],
        ]);
    }

    /**
     * Remove the specified question daily limit.
     */
    public function destroy(QuestionDailyLimit $limit): JsonResponse
    {
        Gate::authorize('delete', $limit);

        $this->activityLogService->logDelete($limit);
        $limit->delete();

        return $this->success(null, 'Günlük soru limiti başarıyla silindi.');
    }
}
