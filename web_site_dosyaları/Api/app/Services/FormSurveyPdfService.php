<?php

namespace App\Services;

use App\Models\FormSurvey;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class FormSurveyPdfService
{
    /**
     * Generate optical form PDF for form survey.
     *
     * @param  \App\Models\FormSurvey  $formSurvey
     * @return string File path
     */
    public function generateOpticalFormPdf(FormSurvey $formSurvey): string
    {
        $tenantId = Auth::user()->tenant_id ?? $formSurvey->tenant_id;
        $tenant = \App\Models\Tenant::find($tenantId);

        $data = [
            'survey' => $formSurvey,
            'tenant' => $tenant,
            'questions' => $formSurvey->questions ?? [],
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];

        $pdf = Pdf::loadView('form-surveys.optical-form', $data)
            ->setPaper('a4', 'portrait');

        $fileName = "form_survey_optical_{$formSurvey->id}_" . now()->format('YmdHis') . ".pdf";
        $filePath = "form-surveys/{$tenantId}/optical-forms/{$fileName}";

        Storage::disk('local')->put($filePath, $pdf->output());

        return $filePath;
    }

    /**
     * Generate personnel survey report card PDF.
     *
     * @param  \App\Models\FormSurvey  $formSurvey
     * @param  int|null  $userId
     * @return string File path
     */
    public function generatePersonnelReportCard(FormSurvey $formSurvey, ?int $userId = null): string
    {
        $tenantId = Auth::user()->tenant_id ?? $formSurvey->tenant_id;
        $tenant = \App\Models\Tenant::find($tenantId);

        // Eğer userId belirtilmişse, o kullanıcının cevaplarını al
        $responses = $formSurvey->responses();
        if ($userId) {
            $responses->where('respondent_id', $userId);
        }
        $responses = $responses->with('respondent')->get();

        $data = [
            'survey' => $formSurvey,
            'tenant' => $tenant,
            'responses' => $responses,
            'questions' => $formSurvey->questions ?? [],
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];

        $pdf = Pdf::loadView('form-surveys.personnel-report-card', $data)
            ->setPaper('a4', 'portrait');

        $fileName = "form_survey_report_card_{$formSurvey->id}" . ($userId ? "_user_{$userId}" : "") . "_" . now()->format('YmdHis') . ".pdf";
        $filePath = "form-surveys/{$tenantId}/report-cards/{$fileName}";

        Storage::disk('local')->put($filePath, $pdf->output());

        return $filePath;
    }
}
