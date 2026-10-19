<?php

namespace App\Actions;

use App\Models\SmsTemplate;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateSmsTemplateAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update an SMS template.
     *
     * @param  \App\Models\SmsTemplate  $template
     * @param  array  $templateData
     * @return \App\Models\SmsTemplate
     */
    public function execute(SmsTemplate $template, array $templateData): SmsTemplate
    {
        return DB::transaction(function () use ($template, $templateData) {
            $template->fill($templateData);
            
            // İçerik değiştiyse, değişkenleri güncelle
            if (isset($templateData['content'])) {
                $availableVariables = $template->getAvailableVariables();
                if (!empty($availableVariables)) {
                    $template->variables = $availableVariables;
                }
            }

            $template->save();

            $this->activityLogService->logUpdate($template);

            // İlişkileri yükle
            $template->load(['creator']);

            return $template;
        });
    }
}
