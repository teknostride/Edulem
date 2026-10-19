<?php

namespace App\Http\Controllers;

use App\Actions\CreateBulletinTemplateAction;
use App\Http\Requests\StoreBulletinTemplateRequest;
use App\Http\Resources\BulletinTemplateResource;
use App\Models\BulletinTemplate;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class BulletinTemplateController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of bulletin templates.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', BulletinTemplate::class);

        $query = BulletinTemplate::with(['creator']);

        // Filtreleme
        if (request()->has('active_only')) {
            $query->where('is_active', true);
        }

        if (request()->has('default_only')) {
            $query->where('is_default', true);
        }

        // Sıralama
        $query->orderBy('is_default', 'desc')
            ->orderBy('name');

        $templates = $query->paginate(request('per_page', 50));

        return $this->success([
            'templates' => BulletinTemplateResource::collection($templates),
            'pagination' => [
                'current_page' => $templates->currentPage(),
                'last_page' => $templates->lastPage(),
                'per_page' => $templates->perPage(),
                'total' => $templates->total(),
            ],
        ], 'Bülten şablonları başarıyla listelendi.');
    }

    /**
     * Store a newly created bulletin template.
     */
    public function store(StoreBulletinTemplateRequest $request, CreateBulletinTemplateAction $action): JsonResponse
    {
        Gate::authorize('create', BulletinTemplate::class);

        try {
            $template = $action->execute($request->validated());

            return $this->success(new BulletinTemplateResource($template), 'Bülten şablonu başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified bulletin template.
     */
    public function show(BulletinTemplate $bulletinTemplate): JsonResponse
    {
        Gate::authorize('view', $bulletinTemplate);

        $bulletinTemplate->load(['creator']);

        return $this->success(new BulletinTemplateResource($bulletinTemplate));
    }

    /**
     * Update the specified bulletin template.
     */
    public function update(StoreBulletinTemplateRequest $request, BulletinTemplate $bulletinTemplate): JsonResponse
    {
        Gate::authorize('update', $bulletinTemplate);

        try {
            $data = $request->validated();

            // Eğer varsayılan olarak işaretleniyorsa, diğer varsayılanları kaldır
            if ($data['is_default'] ?? false) {
                BulletinTemplate::where('tenant_id', $bulletinTemplate->tenant_id)
                    ->where('id', '!=', $bulletinTemplate->id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $bulletinTemplate->update($data);
            $this->activityLogService->logUpdate($bulletinTemplate);

            return $this->success(new BulletinTemplateResource($bulletinTemplate->fresh()), 'Bülten şablonu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified bulletin template.
     */
    public function destroy(BulletinTemplate $bulletinTemplate): JsonResponse
    {
        Gate::authorize('delete', $bulletinTemplate);

        // Kullanımda olan şablonları silme
        if ($bulletinTemplate->bulletins()->count() > 0) {
            return $this->error('Bu şablon kullanımda olduğu için silinemez.', [], 400);
        }

        $this->activityLogService->logDelete($bulletinTemplate);
        $bulletinTemplate->delete();

        return $this->success(null, 'Bülten şablonu başarıyla silindi.');
    }
}
