<?php

namespace App\Http\Controllers;

use App\Actions\CreateSmsTemplateAction;
use App\Actions\UpdateSmsTemplateAction;
use App\Http\Requests\StoreSmsTemplateRequest;
use App\Http\Requests\UpdateSmsTemplateRequest;
use App\Http\Resources\SmsTemplateResource;
use App\Models\SmsTemplate;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class SmsTemplateController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of SMS templates.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();
        if (!$user) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $query = SmsTemplate::with(['creator']);

        // Filtreleme
        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        if (request()->has('code')) {
            $query->where('code', request('code'));
        }

        $templates = $query->latest('created_at')->paginate(request('per_page', 50));

        return $this->success([
            'templates' => SmsTemplateResource::collection($templates),
            'pagination' => [
                'current_page' => $templates->currentPage(),
                'last_page' => $templates->lastPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
            ],
        ], 'SMS şablonları başarıyla listelendi.');
    }

    /**
     * Store a newly created SMS template.
     */
    public function store(StoreSmsTemplateRequest $request, CreateSmsTemplateAction $createAction): JsonResponse
    {
        Gate::authorize('create', SmsTemplate::class);

        $template = $createAction->execute($request->validated());

        return $this->success(new SmsTemplateResource($template), 'SMS şablonu başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified SMS template.
     */
    public function show(SmsTemplate $smsTemplate): JsonResponse
    {
        Gate::authorize('view', $smsTemplate);

        $smsTemplate->load(['creator']);

        return $this->success(new SmsTemplateResource($smsTemplate));
    }

    /**
     * Update the specified SMS template.
     */
    public function update(UpdateSmsTemplateRequest $request, SmsTemplate $smsTemplate, UpdateSmsTemplateAction $updateAction): JsonResponse
    {
        Gate::authorize('update', $smsTemplate);

        $updatedTemplate = $updateAction->execute($smsTemplate, $request->validated());

        return $this->success(new SmsTemplateResource($updatedTemplate), 'SMS şablonu başarıyla güncellendi.');
    }

    /**
     * Remove the specified SMS template.
     */
    public function destroy(SmsTemplate $smsTemplate): JsonResponse
    {
        Gate::authorize('delete', $smsTemplate);

        $this->activityLogService->logDelete($smsTemplate);
        $smsTemplate->delete();

        return $this->success(null, 'SMS şablonu başarıyla silindi.');
    }

    /**
     * Render template with provided data.
     */
    public function render(SmsTemplate $smsTemplate): JsonResponse
    {
        Gate::authorize('view', $smsTemplate);

        request()->validate([
            'data' => ['required', 'array'],
        ]);

        $data = request('data');

        // Tüm değişkenler sağlanmış mı kontrol et
        if (!$smsTemplate->hasAllVariables($data)) {
            $missing = array_diff($smsTemplate->getAvailableVariables(), array_keys($data));
            return $this->error('Eksik değişkenler: ' . implode(', ', $missing), [], 400);
        }

        $rendered = $smsTemplate->render($data);

        return $this->success([
            'template_id' => $smsTemplate->id,
            'template_code' => $smsTemplate->code,
            'rendered_content' => $rendered,
            'variables_used' => $smsTemplate->getAvailableVariables(),
        ], 'Şablon başarıyla render edildi.');
    }
}
