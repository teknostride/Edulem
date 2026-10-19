<?php

namespace App\Http\Controllers;

use App\Actions\CreateReportCardTemplateAction;
use App\Http\Requests\StoreReportCardTemplateRequest;
use App\Models\ReportCardTemplate;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ReportCardTemplateController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of report card templates.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ReportCardTemplate::class);

        $query = ReportCardTemplate::with(['pdfTemplateFile']);

        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        if (request('default_only')) {
            $query->where('is_default', true);
        }

        $templates = $query->paginate(request('per_page', 50));

        return $this->paginated($templates, []);
    }

    /**
     * Store a newly created report card template.
     */
    public function store(StoreReportCardTemplateRequest $request, CreateReportCardTemplateAction $createReportCardTemplateAction): JsonResponse
    {
        Gate::authorize('create', ReportCardTemplate::class);

        $template = $createReportCardTemplateAction->execute($request->validated());

        return $this->success([
            'template' => [
                'id' => $template->id,
                'name' => $template->name,
                'type' => $template->type,
                'is_default' => $template->is_default,
            ],
        ], 'Karne şablonu başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified report card template.
     */
    public function show(ReportCardTemplate $template): JsonResponse
    {
        Gate::authorize('view', $template);

        return $this->success([
            'template' => [
                'id' => $template->id,
                'name' => $template->name,
                'type' => $template->type,
                'description' => $template->description,
                'template_config' => $template->template_config,
                'is_active' => $template->is_active,
                'is_default' => $template->is_default,
            ],
        ]);
    }

    /**
     * Remove the specified report card template.
     */
    public function destroy(ReportCardTemplate $template): JsonResponse
    {
        Gate::authorize('delete', $template);

        $this->activityLogService->logDelete($template);
        $template->delete();

        return $this->success(null, 'Karne şablonu başarıyla silindi.');
    }
}
