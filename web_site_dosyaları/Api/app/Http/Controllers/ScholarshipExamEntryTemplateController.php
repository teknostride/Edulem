<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScholarshipExamEntryTemplateRequest;
use App\Http\Requests\UpdateScholarshipExamEntryTemplateRequest;
use App\Http\Resources\ScholarshipExamEntryTemplateResource;
use App\Models\ScholarshipExam;
use App\Models\ScholarshipExamEntryTemplate;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ScholarshipExamEntryTemplateController extends ApiController
{
    public function __construct(private ActivityLogService $activityLogService)
    {
    }

    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ScholarshipExam::class);

        $query = ScholarshipExamEntryTemplate::with(['creator']);

        if (request()->has('scholarship_exam_id')) {
            $query->where('scholarship_exam_id', request('scholarship_exam_id'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        $templates = $query->latest('created_at')->paginate(request('per_page', 50));

        return $this->success([
            'templates' => ScholarshipExamEntryTemplateResource::collection($templates),
            'pagination' => [
                'current_page' => $templates->currentPage(),
                'last_page' => $templates->lastPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
            ],
        ], 'Bursluluk sınavı giriş belgesi şablonları başarıyla listelendi.');
    }

    public function store(StoreScholarshipExamEntryTemplateRequest $request): JsonResponse
    {
        $exam = ScholarshipExam::findOrFail($request->validated()['scholarship_exam_id']);
        Gate::authorize('update', $exam);

        $data = $request->validated();
        $data['tenant_id'] = $exam->tenant_id;
        $data['created_by'] = auth()->id();

        $template = ScholarshipExamEntryTemplate::create($data);

        if (($data['is_active'] ?? false) === true) {
            ScholarshipExamEntryTemplate::where('scholarship_exam_id', $exam->id)
                ->where('id', '!=', $template->id)
                ->update(['is_active' => false]);
        }

        return $this->success(new ScholarshipExamEntryTemplateResource($template->load('creator')), 'Şablon başarıyla oluşturuldu.', 201);
    }

    public function show(ScholarshipExamEntryTemplate $scholarshipExamEntryTemplate): JsonResponse
    {
        $exam = ScholarshipExam::findOrFail($scholarshipExamEntryTemplate->scholarship_exam_id);
        Gate::authorize('view', $exam);

        return $this->success(new ScholarshipExamEntryTemplateResource($scholarshipExamEntryTemplate->load('creator')));
    }

    public function update(UpdateScholarshipExamEntryTemplateRequest $request, ScholarshipExamEntryTemplate $scholarshipExamEntryTemplate): JsonResponse
    {
        $exam = ScholarshipExam::findOrFail($scholarshipExamEntryTemplate->scholarship_exam_id);
        Gate::authorize('update', $exam);

        $scholarshipExamEntryTemplate->update($request->validated());
        $this->activityLogService->logUpdate($scholarshipExamEntryTemplate);

        if ($request->has('is_active') && $request->boolean('is_active') === true) {
            ScholarshipExamEntryTemplate::where('scholarship_exam_id', $exam->id)
                ->where('id', '!=', $scholarshipExamEntryTemplate->id)
                ->update(['is_active' => false]);
        }

        return $this->success(new ScholarshipExamEntryTemplateResource($scholarshipExamEntryTemplate->fresh()->load('creator')), 'Şablon başarıyla güncellendi.');
    }

    public function destroy(ScholarshipExamEntryTemplate $scholarshipExamEntryTemplate): JsonResponse
    {
        $exam = ScholarshipExam::findOrFail($scholarshipExamEntryTemplate->scholarship_exam_id);
        Gate::authorize('update', $exam);

        $this->activityLogService->logDelete($scholarshipExamEntryTemplate);
        $scholarshipExamEntryTemplate->delete();

        return $this->success(null, 'Şablon başarıyla silindi.');
    }
}
