<?php

namespace App\Jobs;

use App\Mail\ReportMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendReportByEmailJob implements ShouldQueue
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
     * Report type.
     *
     * @var string
     */
    protected string $reportType;

    /**
     * File path.
     *
     * @var string
     */
    protected string $filePath;

    /**
     * File format.
     *
     * @var string
     */
    protected string $format;

    /**
     * Recipient email.
     *
     * @var string
     */
    protected string $recipientEmail;

    /**
     * Recipient name.
     *
     * @var string
     */
    protected string $recipientName;

    /**
     * Create a new job instance.
     *
     * @param  string  $reportType
     * @param  string  $filePath
     * @param  string  $format
     * @param  string  $recipientEmail
     * @param  string  $recipientName
     */
    public function __construct(
        string $reportType,
        string $filePath,
        string $format,
        string $recipientEmail,
        string $recipientName = ''
    ) {
        $this->reportType = $reportType;
        $this->filePath = $filePath;
        $this->format = $format;
        $this->recipientEmail = $recipientEmail;
        $this->recipientName = $recipientName;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        try {
            Mail::to($this->recipientEmail)
                ->send(new ReportMail(
                    $this->reportType,
                    $this->filePath,
                    $this->format,
                    $this->recipientEmail,
                    $this->recipientName
                ));

            Log::info('Rapor e-posta ile başarıyla gönderildi', [
                'report_type' => $this->reportType,
                'recipient' => $this->recipientEmail,
                'format' => $this->format,
            ]);

        } catch (\Exception $e) {
            Log::error('Rapor e-posta gönderim hatası', [
                'report_type' => $this->reportType,
                'recipient' => $this->recipientEmail,
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
        Log::error('Rapor e-posta job kalıcı olarak başarısız oldu', [
            'report_type' => $this->reportType,
            'recipient' => $this->recipientEmail,
            'error' => $exception->getMessage(),
        ]);
    }
}
