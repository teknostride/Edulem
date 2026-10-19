<?php

namespace App\Jobs;

use App\Models\Exam;
use App\Services\ExamEntryDocumentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateExamEntryDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Exam $exam,
        public ?int $studentId = null
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(ExamEntryDocumentService $service): void
    {
        try {
            if ($this->studentId) {
                // Tek öğrenci için PDF oluştur
                $filePath = $service->generateStudentEntryDocument($this->exam, $this->studentId);
                Log::info('Sınav giriş belgesi oluşturuldu', [
                    'exam_id' => $this->exam->id,
                    'student_id' => $this->studentId,
                    'file_path' => $filePath,
                ]);
            } else {
                // Tüm öğrenciler için PDF oluştur
                $filePaths = $service->generateAllEntryDocuments($this->exam);
                Log::info('Tüm sınav giriş belgeleri oluşturuldu', [
                    'exam_id' => $this->exam->id,
                    'total_files' => count($filePaths),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Sınav giriş belgesi oluşturma hatası', [
                'exam_id' => $this->exam->id,
                'student_id' => $this->studentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
