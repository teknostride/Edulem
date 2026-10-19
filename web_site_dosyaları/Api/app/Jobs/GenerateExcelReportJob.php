<?php

namespace App\Jobs;

use App\Services\ExcelExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class GenerateExcelReportJob implements ShouldQueue
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
     * Report parameters.
     *
     * @var array
     */
    protected array $parameters;

    /**
     * User ID who requested the report.
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
     * @param  string  $reportType
     * @param  array  $parameters
     * @param  int  $userId
     * @param  int  $tenantId
     */
    public function __construct(string $reportType, array $parameters, int $userId, int $tenantId)
    {
        $this->reportType = $reportType;
        $this->parameters = $parameters;
        $this->userId = $userId;
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(ExcelExportService $excelService): void
    {
        try {
            // Tenant context'ini ayarla
            $user = \App\Models\User::find($this->userId);
            if ($user) {
                Auth::setUser($user);
            }

            $filePath = $excelService->export($this->reportType, $this->parameters, 'excel');

            Log::info('Excel rapor başarıyla oluşturuldu', [
                'report_type' => $this->reportType,
                'file_path' => $filePath,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
            ]);

            // Dosya metadata'sını kaydet (ileride files tablosuna kaydedilebilir)
            // File::create([...]);

        } catch (\Exception $e) {
            Log::error('Excel rapor oluşturma hatası', [
                'report_type' => $this->reportType,
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
        Log::error('Excel rapor job kalıcı olarak başarısız oldu', [
            'report_type' => $this->reportType,
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
