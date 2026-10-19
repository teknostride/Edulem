<?php

namespace App\Jobs;

use App\Services\ReportCardService;
use App\Services\FileStorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class GenerateReportCardPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * Student ID.
     *
     * @var int
     */
    protected int $studentId;

    /**
     * Semester ('first' or 'second').
     *
     * @var string
     */
    protected string $semester;

    /**
     * Academic Year ID (optional).
     *
     * @var int|null
     */
    protected ?int $academicYearId;

    /**
     * Template ID (optional).
     *
     * @var int|null
     */
    protected ?int $templateId;

    /**
     * User ID who requested the report card.
     *
     * @var int
     */
    protected int $userId;

    /**
     * Tenant ID.
     *
     * @var int
     */
    protected int $tenantId;

    /**
     * Create a new job instance.
     *
     * @param  int  $studentId
     * @param  string  $semester
     * @param  int|null  $academicYearId
     * @param  int|null  $templateId
     * @param  int  $userId
     * @param  int  $tenantId
     */
    public function __construct(
        int $studentId,
        string $semester,
        ?int $academicYearId,
        ?int $templateId,
        int $userId,
        int $tenantId
    ) {
        $this->studentId = $studentId;
        $this->semester = $semester;
        $this->academicYearId = $academicYearId;
        $this->templateId = $templateId;
        $this->userId = $userId;
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(ReportCardService $reportCardService, FileStorageService $fileService): void
    {
        try {
            // Tenant context'ini ayarla
            $user = \App\Models\User::find($this->userId);
            if ($user) {
                Auth::setUser($user);
            }

            // PDF oluştur
            $filePath = $reportCardService->generatePdf(
                $this->studentId,
                $this->semester,
                $this->academicYearId,
                $this->templateId
            );

            // PDF içeriğini oku
            $pdfContent = \Illuminate\Support\Facades\Storage::disk('local')->get($filePath);

            // S3/MinIO'ya kaydet (opsiyonel)
            $s3Path = "report_cards/{$this->tenantId}/" . basename($filePath);
            $fileService->storeFile($s3Path, $pdfContent, 'application/pdf');

            // File metadata kaydet
            $file = $fileService->createFileRecord(
                $this->tenantId,
                $s3Path,
                'report_card_pdf',
                $this->studentId,
                \App\Models\Student::class,
                strlen($pdfContent),
                'application/pdf'
            );

            Log::info('Karne PDF başarıyla oluşturuldu', [
                'student_id' => $this->studentId,
                'semester' => $this->semester,
                'file_id' => $file->id,
                'file_path' => $filePath,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
            ]);

        } catch (\Exception $e) {
            Log::error('Karne PDF oluşturma hatası', [
                'student_id' => $this->studentId,
                'semester' => $this->semester,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Karne PDF job kalıcı olarak başarısız oldu', [
            'student_id' => $this->studentId,
            'semester' => $this->semester,
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
