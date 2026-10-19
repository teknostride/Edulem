<?php

namespace App\Actions;

use App\Models\Contract;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateContractAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a contract record.
     *
     * @param  array  $contractData
     * @return \App\Models\Contract
     * @throws \Exception
     */
    public function execute(array $contractData): Contract
    {
        return DB::transaction(function () use ($contractData) {
            // Sözleşme numarası oluştur
            $contractNo = $this->generateContractNo();

            $contract = Contract::create([
                'tenant_id' => Auth::user()->tenant_id,
                'student_id' => $contractData['student_id'],
                'contract_no' => $contractNo,
                'contract_date' => $contractData['contract_date'],
                'start_date' => $contractData['start_date'],
                'end_date' => $contractData['end_date'] ?? null,
                'total_amount' => $contractData['total_amount'],
                'status' => $contractData['status'] ?? 'draft',
                'file_id' => $contractData['file_id'] ?? null,
                'terms' => $contractData['terms'] ?? null,
                'notes' => $contractData['notes'] ?? null,
                'created_by' => Auth::id(),
                'signed_by_guardian' => $contractData['signed_by_guardian'] ?? null,
                'signed_at' => $contractData['signed_at'] ?? null,
            ]);

            $this->activityLogService->logCreate($contract);

            // İlişkileri yükle
            $contract->load(['student', 'file', 'creator', 'signedByGuardian']);

            return $contract;
        });
    }

    /**
     * Generate a unique contract number.
     *
     * @return string
     */
    protected function generateContractNo(): string
    {
        $tenantId = Auth::user()->tenant_id;
        $year = date('Y');
        $prefix = 'SOZ-' . $tenantId . '-' . $year . '-';

        // Son sözleşme numarasını bul
        $lastContract = Contract::where('tenant_id', $tenantId)
            ->where('contract_no', 'like', $prefix . '%')
            ->orderBy('contract_no', 'desc')
            ->first();

        if ($lastContract) {
            // Son numarayı al ve artır
            $lastNumber = (int) substr($lastContract->contract_no, strlen($prefix));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }
}
