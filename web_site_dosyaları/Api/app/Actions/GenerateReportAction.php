<?php

namespace App\Actions;

use App\Jobs\GenerateExcelReportJob;
use App\Jobs\GeneratePdfReportJob;
use App\Jobs\SendReportByEmailJob;
use App\Services\ExcelExportService;
use App\Services\PdfExportService;
use Illuminate\Support\Facades\Auth;

class GenerateReportAction
{
    /**
     * Execute the action to generate and optionally send report.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @param  string  $format
     * @param  bool  $sendEmail
     * @param  string|null  $recipientEmail
     * @return array
     */
    public function execute(
        string $reportType,
        array $parameters,
        string $format = 'excel',
        bool $sendEmail = false,
        ?string $recipientEmail = null
    ): array {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        // Format kontrolü
        if (!in_array($format, ['excel', 'pdf'])) {
            throw new \Exception('Desteklenmeyen format. Sadece excel ve pdf desteklenir.');
        }

        // E-posta gönderilecekse, e-posta adresi zorunlu
        if ($sendEmail && empty($recipientEmail)) {
            throw new \Exception('E-posta gönderimi için alıcı e-posta adresi gereklidir.');
        }

        // Raporu queue'ya ekle (e-posta gönderilmeyecekse)
        if (!$sendEmail) {
            if ($format === 'excel') {
                GenerateExcelReportJob::dispatch($reportType, $parameters, $user->id, $tenantId);
            } else {
                GeneratePdfReportJob::dispatch($reportType, $parameters, $user->id, $tenantId);
            }
        }

        // E-posta gönderilecekse, önce raporu oluştur sonra gönder
        if ($sendEmail) {
            // Not: Gerçek uygulamada, rapor oluşturulduktan sonra callback ile e-posta gönderilmeli
            // Şimdilik basit bir yaklaşım: Rapor oluşturulduktan sonra e-posta job'ı ekle
            // İleride event/listener yapısı ile daha iyi bir çözüm yapılabilir
            
            // Geçici çözüm: Raporu senkron oluştur ve e-posta gönder
            if ($format === 'excel') {
                $excelService = app(ExcelExportService::class);
                $filePath = $excelService->export($reportType, $parameters, 'excel');
            } else {
                $pdfService = app(PdfExportService::class);
                $filePath = $pdfService->export($reportType, $parameters, 'pdf');
            }

            SendReportByEmailJob::dispatch(
                $reportType,
                $filePath,
                $format,
                $recipientEmail,
                $user->name
            );
        }

        return [
            'success' => true,
            'message' => $sendEmail 
                ? 'Rapor oluşturuldu ve e-posta ile gönderildi.' 
                : 'Rapor oluşturma işlemi kuyruğa eklendi.',
            'data' => [
                'report_type' => $reportType,
                'format' => $format,
                'send_email' => $sendEmail,
            ],
        ];
    }
}
