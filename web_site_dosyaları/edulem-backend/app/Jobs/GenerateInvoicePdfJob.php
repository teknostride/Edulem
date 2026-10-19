<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Services\FileStorageService;
use App\Services\PdfExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class GenerateInvoicePdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Invoice $invoice
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(PdfExportService $pdfService, FileStorageService $fileService): void
    {
        try {
            // PDF oluştur
            $pdfContent = $pdfService->generateFromView(
                'invoices.invoice',
                ['invoice' => $this->invoice->load(['student', 'createdBy', 'tenant'])]
            );

            // Dosya adı
            $fileName = 'invoices/' . $this->invoice->tenant_id . '/' . $this->invoice->invoice_no . '.pdf';

            // S3/MinIO'ya kaydet
            $fileService->storeFile($fileName, $pdfContent, 'application/pdf');

            // File metadata kaydet
            $file = $fileService->createFileRecord(
                $this->invoice->tenant_id,
                $fileName,
                'invoice_pdf',
                $this->invoice->id,
                Invoice::class,
                strlen($pdfContent),
                'application/pdf'
            );

            // Invoice'a file_id ekle
            $this->invoice->update(['file_id' => $file->id]);

        } catch (\Exception $e) {
            \Log::error('Invoice PDF generation failed: ' . $e->getMessage(), [
                'invoice_id' => $this->invoice->id,
                'exception' => $e,
            ]);

            throw $e;
        }
    }
}
