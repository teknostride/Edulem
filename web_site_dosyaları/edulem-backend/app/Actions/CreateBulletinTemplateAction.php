<?php

namespace App\Actions;

use App\Models\BulletinTemplate;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateBulletinTemplateAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a bulletin template.
     *
     * @param  array  $templateData
     * @return \App\Models\BulletinTemplate
     * @throws \Exception
     */
    public function execute(array $templateData): BulletinTemplate
    {
        return DB::transaction(function () use ($templateData) {
            // Eğer varsayılan olarak işaretleniyorsa, diğer varsayılanları kaldır
            if ($templateData['is_default'] ?? false) {
                BulletinTemplate::where('tenant_id', $templateData['tenant_id'] ?? auth()->user()->tenant_id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $template = BulletinTemplate::create([
                'name' => $templateData['name'],
                'description' => $templateData['description'] ?? null,
                'template_data' => $templateData['template_data'],
                'is_default' => $templateData['is_default'] ?? false,
                'is_active' => $templateData['is_active'] ?? true,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($template);

            // İlişkileri yükle
            $template->load(['creator']);

            return $template;
        });
    }
}
