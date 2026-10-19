<?php

namespace App\Actions;

use App\Models\Payment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdatePaymentAction
{
    /**
     * Execute the action to update a payment.
     *
     * @param  \App\Models\Payment  $payment
     * @param  array  $paymentData
     * @return \App\Models\Payment
     * @throws \Exception
     */
    public function execute(Payment $payment, array $paymentData): Payment
    {
        return DB::transaction(function () use ($payment, $paymentData) {
            // Eski değerleri sakla (activity log için)
            $oldValues = $payment->toArray();

            // Ödeme kaydını güncelle
            $payment->update([
                'student_id' => $paymentData['student_id'] ?? $payment->student_id,
                'amount' => $paymentData['amount'] ?? $payment->amount,
                'payment_date' => $paymentData['payment_date'] ?? $payment->payment_date,
                'payment_method' => $paymentData['payment_method'] ?? $payment->payment_method,
                'receipt_no' => $paymentData['receipt_no'] ?? $payment->receipt_no,
                'notes' => $paymentData['notes'] ?? $payment->notes,
            ]);

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logUpdate($payment);

            // İlişkileri yükle
            $payment->load(['student', 'receivedBy', 'tenant']);

            return $payment;
        });
    }
}
