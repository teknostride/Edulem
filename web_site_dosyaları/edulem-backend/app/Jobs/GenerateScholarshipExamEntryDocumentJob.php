<?php

namespace App\Jobs;

use App\Models\ScholarshipExam;
use App\Services\ScholarshipExamEntryDocumentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateScholarshipExamEntryDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ScholarshipExam $exam,
        public ?int $applicationId = null
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(ScholarshipExamEntryDocumentService $service): void
    {
        try {
            if ($this->applicationId) {
                // Tek başvuru için PDF oluştur
                $filePath = $service->generateApplicationEntryDocument($this->exam, $this->applicationId);
                Log::info('Bursluluk sınavı giriş belgesi oluşturuldu', [
                    'exam_id' => $this->exam->id,
                    'application_id' => $this->applicationId,
                    'file_path' => $filePath,
                ]);
            } else {
                // Tüm başvurular için PDF oluştur
                $filePaths = $service->generateAllEntryDocuments($this->exam);
                Log::info('Tüm bursluluk sınavı giriş belgeleri oluşturuldu', [
                    'exam_id' => $this->exam->id,
                    'total_files' => count($filePaths),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Bursluluk sınavı giriş belgesi oluşturma hatası', [
                'exam_id' => $this->exam->id,
                'application_id' => $this->applicationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
