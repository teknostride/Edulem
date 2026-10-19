<?php

namespace App\Actions;

use App\Models\Expense;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateExpenseAction
{
    /**
     * Execute the action to create an expense.
     *
     * @param  array  $expenseData
     * @return \App\Models\Expense
     * @throws \Exception
     */
    public function execute(array $expenseData): Expense
    {
        return DB::transaction(function () use ($expenseData) {
            // Gider kaydı oluştur
            $expense = Expense::create([
                'category' => $expenseData['expense_category'],
                'amount' => $expenseData['amount'],
                'expense_date' => $expenseData['expense_date'],
                'title' => $expenseData['description'], // title = description
                'description' => $expenseData['description'],
                'payment_method' => $expenseData['payment_method'],
                'receipt_no' => $expenseData['receipt_no'] ?? $this->generateReceiptNo(),
                'notes' => $expenseData['notes'] ?? null,
                'paid_by' => Auth::id(),
            ]);

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logCreate($expense);

            // İlişkileri yükle
            $expense->load(['createdBy', 'tenant']);

            return $expense;
        });
    }

    /**
     * Generate a unique receipt number.
     *
     * @return string
     */
    protected function generateReceiptNo(): string
    {
        $prefix = 'FIS-';
        $year = now()->format('Y');
        $month = now()->format('m');
        
        // Son fiş numarasını al
        $lastReceipt = Expense::where('receipt_no', 'like', "{$prefix}{$year}{$month}%")
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
