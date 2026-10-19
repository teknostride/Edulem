<?php

namespace App\Actions;

use App\Models\Installment;
use App\Models\InstallmentPayment;
use App\Models\Payment;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PayInstallmentAction
{
    /**
     * Execute the action to pay an installment.
     *
     * @param  \App\Models\InstallmentPayment  $installmentPayment
     * @param  array  $paymentData
     * @return \App\Models\Payment
     * @throws \Exception
     */
    public function execute(InstallmentPayment $installmentPayment, array $paymentData): Payment
    {
        return DB::transaction(function () use ($installmentPayment, $paymentData) {
            // Ödeme kaydı oluştur
            $payment = Payment::create([
                'student_id' => $installmentPayment->installment->student_id,
                'amount' => $installmentPayment->amount,
                'payment_date' => $paymentData['payment_date'] ?? now()->format('Y-m-d'),
                'payment_method' => $paymentData['payment_method'] ?? 'cash',
                'receipt_no' => $paymentData['receipt_no'] ?? $this->generateReceiptNo(),
                'notes' => $paymentData['notes'] ?? "Taksit #{$installmentPayment->installment_number} ödemesi",
                'received_by' => Auth::id(),
            ]);

            // Taksit ödemesini güncelle
            $installmentPayment->update([
                'payment_id' => $payment->id,
                'paid_date' => now()->format('Y-m-d'),
                'status' => 'paid',
            ]);

            // Taksit planının durumunu kontrol et
            $installment = $installmentPayment->installment;
            $remainingPayments = $installment->installmentPayments()
                ->where('status', 'pending')
                ->count();

            if ($remainingPayments === 0) {
                $installment->update(['status' => 'completed']);
            }

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logUpdate($installmentPayment);

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
