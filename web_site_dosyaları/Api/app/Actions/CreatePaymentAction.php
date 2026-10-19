<?php

namespace App\Actions;

use App\Models\Payment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreatePaymentAction
{
    /**
     * Execute the action to create a payment.
     *
     * @param  array  $paymentData
     * @return \App\Models\Payment
     * @throws \Exception
     */
    public function execute(array $paymentData): Payment
    {
        return DB::transaction(function () use ($paymentData) {
            // Ödeme kaydı oluştur
            $payment = Payment::create([
                'student_id' => $paymentData['student_id'],
                'amount' => $paymentData['amount'],
                'payment_date' => $paymentData['payment_date'],
                'payment_method' => $paymentData['payment_method'],
                'receipt_no' => $paymentData['receipt_no'] ?? $this->generateReceiptNo(),
                'notes' => $paymentData['notes'] ?? null,
                'received_by' => Auth::id(),
            ]);

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logCreate($payment);

            // İlişkileri yükle
            $payment->load(['student', 'receivedBy', 'tenant']);

            return $payment;
        });
    }

    /**
     * Generate a unique receipt number.
     *
     * @return string
     */
    protected function generateReceiptNo(): string
    {
        $prefix = 'MBZ-';
        $year = now()->format('Y');
        $month = now()->format('m');
        
        // Son makbuz numarasını al
        $lastReceipt = Payment::where('receipt_no', 'like', "{$prefix}{$year}{$month}%")
            ->orderBy('receipt_no', 'desc')
            ->first();

        if ($lastReceipt && $lastReceipt->receipt_no) {
            $lastNumber = (int) substr($lastReceipt->receipt_no, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . $year . $month . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}
