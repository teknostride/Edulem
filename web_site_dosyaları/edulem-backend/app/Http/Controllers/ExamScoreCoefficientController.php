<?php

namespace App\Http\Controllers;

use App\Actions\CreateExamScoreCoefficientAction;
use App\Http\Requests\StoreExamScoreCoefficientRequest;
use App\Models\ExamScoreCoefficient;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ExamScoreCoefficientController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of exam score coefficients.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ExamScoreCoefficient::class);

        $query = ExamScoreCoefficient::with(['exam']);

        if (request()->has('exam_id')) {
            $query->where('exam_id', request('exam_id'));
        }

        if (request()->has('coefficient_type')) {
            $query->where('coefficient_type', request('coefficient_type'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        $coefficients = $query->paginate(request('per_page', 50));

        return $this->paginated($coefficients, []);
    }

    /**
     * Store a newly created exam score coefficient.
     */
    public function store(StoreExamScoreCoefficientRequest $request, CreateExamScoreCoefficientAction $createExamScoreCoefficientAction): JsonResponse
    {
        Gate::authorize('create', ExamScoreCoefficient::class);

        $coefficient = $createExamScoreCoefficientAction->execute($request->validated());

        return $this->success([
            'coefficient' => [
                'id' => $coefficient->id,
                'exam_id' => $coefficient->exam_id,
                'coefficient_type' => $coefficient->coefficient_type,
                'coefficient_name' => $coefficient->coefficient_name,
                'coefficients' => $coefficient->coefficients,
            ],
        ], 'Puan katsayısı başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified exam score coefficient.
     */
    public function show(ExamScoreCoefficient $coefficient): JsonResponse
    {
        Gate::authorize('view', $coefficient);

        return $this->success([
            'coefficient' => [
                'id' => $coefficient->id,
                'exam_id' => $coefficient->exam_id,
                'coefficient_type' => $coefficient->coefficient_type,
                'coefficient_name' => $coefficient->coefficient_name,
                'coefficients' => $coefficient->coefficients,
                'is_active' => $coefficient->is_active,
            ],
        ]);
    }

    /**
     * Remove the specified exam score coefficient.
     */
    public function destroy(ExamScoreCoefficient $coefficient): JsonResponse
    {
        Gate::authorize('delete', $coefficient);

        $this->activityLogService->logDelete($coefficient);
        $coefficient->delete();

        return $this->success(null, 'Puan katsayısı başarıyla silindi.');
    }
}
