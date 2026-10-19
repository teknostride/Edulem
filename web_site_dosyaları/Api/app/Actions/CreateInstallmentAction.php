<?php

namespace App\Actions;

use App\Models\Installment;
use App\Models\InstallmentPayment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateInstallmentAction
{
    /**
     * Execute the action to create an installment plan.
     *
     * @param  array  $installmentData
     * @return \App\Models\Installment
     * @throws \Exception
     */
    public function execute(array $installmentData): Installment
    {
        return DB::transaction(function () use ($installmentData) {
            // Taksit tutarını hesapla
            $installmentAmount = $installmentData['total_amount'] / $installmentData['installment_count'];
            
            // Taksit planı oluştur
            $installment = Installment::create([
                'student_id' => $installmentData['student_id'],
                'total_amount' => $installmentData['total_amount'],
                'installment_count' => $installmentData['installment_count'],
                'installment_amount' => round($installmentAmount, 2),
                'start_date' => $installmentData['start_date'],
                'status' => 'active',
                'notes' => $installmentData['notes'] ?? null,
            ]);

            // Taksit kayıtlarını oluştur
            $startDate = \Carbon\Carbon::parse($installmentData['start_date']);
            
            for ($i = 0; $i < $installmentData['installment_count']; $i++) {
                $dueDate = $startDate->copy()->addMonths($i);
                
                InstallmentPayment::create([
                    'installment_id' => $installment->id,
                    'installment_number' => $i + 1,
                    'amount' => round($installmentAmount, 2),
                    'due_date' => $dueDate->format('Y-m-d'),
                    'status' => 'pending',
                ]);
            }

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logCreate($installment);

            // İlişkileri yükle
            $installment->load(['student', 'installmentPayments', 'tenant']);

            return $installment;
        });
    }
}
