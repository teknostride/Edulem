<?php

namespace App\Actions;

use App\Models\SmsTemplate;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateSmsTemplateAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create an SMS template.
     *
     * @param  array  $templateData
     * @return \App\Models\SmsTemplate
     */
    public function execute(array $templateData): SmsTemplate
    {
        return DB::transaction(function () use ($templateData) {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            $template = SmsTemplate::create([
                'tenant_id' => $tenantId,
                'name' => $templateData['name'],
                'code' => $templateData['code'],
                'content' => $templateData['content'],
                'variables' => $templateData['variables'] ?? null,
                'type' => $templateData['type'] ?? 'custom',
                'is_active' => $templateData['is_active'] ?? true,
                'description' => $templateData['description'] ?? null,
                'created_by' => $user->id,
            ]);

            // İçerikten değişkenleri otomatik çıkar
            $availableVariables = $template->getAvailableVariables();
            if (!empty($availableVariables) && empty($templateData['variables'])) {
                $template->update(['variables' => $availableVariables]);
            }

            $this->activityLogService->logCreate($template);

            // İlişkileri yükle
            $template->load(['creator']);

            return $template;
        });
    }
}
