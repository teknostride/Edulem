<?php

namespace App\Jobs;

use App\Services\ContractService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class GenerateContractPdfJob implements ShouldQueue
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
     * Contract ID.
     *
     * @var int
     */
    protected int $contractId;

    /**
     * User ID who requested the contract.
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
     * @param  int  $contractId
     * @param  int  $userId
     * @param  int  $tenantId
     */
    public function __construct(int $contractId, int $userId, int $tenantId)
    {
        $this->contractId = $contractId;
        $this->userId = $userId;
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(ContractService $contractService): void
    {
        try {
            // Tenant context'ini ayarla
            $user = User::find($this->userId);
            if ($user) {
                Auth::setUser($user);
            }

            $filePath = $contractService->generatePdf($this->contractId);

            Log::info('Sözleşme PDF başarıyla oluşturuldu', [
                'contract_id' => $this->contractId,
                'file_path' => $filePath,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
            ]);

            // TODO: File metadata'sını kaydet (ileride files tablosuna kaydedilebilir)
            // File::create([...]);

        } catch (\Exception $e) {
            Log::error('Sözleşme PDF oluşturma hatası', [
                'contract_id' => $this->contractId,
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
    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Sözleşme PDF job kalıcı olarak başarısız oldu', [
            'contract_id' => $this->contractId,
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'error' => $exception->getMessage(),
        ]);
    }
}
