<?php

namespace App\Actions;

use App\Models\ReportCardTemplate;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateReportCardTemplateAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a report card template.
     *
     * @param  array  $templateData
     * @return \App\Models\ReportCardTemplate
     * @throws \Exception
     */
    public function execute(array $templateData): ReportCardTemplate
    {
        return DB::transaction(function () use ($templateData) {
            // Eğer is_default true ise, diğer şablonları false yap
            if ($templateData['is_default'] ?? false) {
                ReportCardTemplate::where('tenant_id', Auth::user()->tenant_id)
                    ->where('type', $templateData['type'])
                    ->update(['is_default' => false]);
            }

            $template = ReportCardTemplate::create([
                'tenant_id' => Auth::user()->tenant_id,
                'name' => $templateData['name'],
                'type' => $templateData['type'],
                'description' => $templateData['description'] ?? null,
                'template_config' => $templateData['template_config'],
                'pdf_template_file_id' => $templateData['pdf_template_file_id'] ?? null,
                'is_active' => $templateData['is_active'] ?? true,
                'is_default' => $templateData['is_default'] ?? false,
            ]);

            $this->activityLogService->logCreate($template);

            return $template;
        });
    }
}
