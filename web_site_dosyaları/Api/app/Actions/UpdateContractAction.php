<?php

namespace App\Actions;

use App\Models\Contract;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;

class UpdateContractAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update a contract record.
     *
     * @param  \App\Models\Contract  $contract
     * @param  array  $contractData
     * @return \App\Models\Contract
     * @throws \Exception
     */
    public function execute(Contract $contract, array $contractData): Contract
    {
        return DB::transaction(function () use ($contract, $contractData) {
            $contract->update([
                'student_id' => $contractData['student_id'] ?? $contract->student_id,
                'contract_date' => $contractData['contract_date'] ?? $contract->contract_date,
                'start_date' => $contractData['start_date'] ?? $contract->start_date,
                'end_date' => $contractData['end_date'] ?? $contract->end_date,
                'total_amount' => $contractData['total_amount'] ?? $contract->total_amount,
                'status' => $contractData['status'] ?? $contract->status,
                'file_id' => $contractData['file_id'] ?? $contract->file_id,
                'terms' => $contractData['terms'] ?? $contract->terms,
                'notes' => $contractData['notes'] ?? $contract->notes,
                'signed_by_guardian' => $contractData['signed_by_guardian'] ?? $contract->signed_by_guardian,
                'signed_at' => $contractData['signed_at'] ?? $contract->signed_at,
            ]);

            $this->activityLogService->logUpdate($contract);

            // İlişkileri yükle
            $contract->load(['student', 'file', 'creator', 'signedByGuardian']);

            return $contract;
        });
    }
}
