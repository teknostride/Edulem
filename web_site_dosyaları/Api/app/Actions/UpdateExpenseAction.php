<?php

namespace App\Actions;

use App\Models\Expense;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateExpenseAction
{
    /**
     * Execute the action to update an expense.
     *
     * @param  \App\Models\Expense  $expense
     * @param  array  $expenseData
     * @return \App\Models\Expense
     * @throws \Exception
     */
    public function execute(Expense $expense, array $expenseData): Expense
    {
        return DB::transaction(function () use ($expense, $expenseData) {
            // Eski değerleri sakla (activity log için)
            $oldValues = $expense->getOriginal();

            // Gider kaydını güncelle
            $updateData = [];
            if (isset($expenseData['expense_category'])) {
                $updateData['category'] = $expenseData['expense_category'];
            }
            if (isset($expenseData['amount'])) {
                $updateData['amount'] = $expenseData['amount'];
            }
            if (isset($expenseData['expense_date'])) {
                $updateData['expense_date'] = $expenseData['expense_date'];
            }
            if (isset($expenseData['description'])) {
                $updateData['title'] = $expenseData['description'];
                $updateData['description'] = $expenseData['description'];
            }
            if (isset($expenseData['payment_method'])) {
                $updateData['payment_method'] = $expenseData['payment_method'];
            }
            if (isset($expenseData['receipt_no'])) {
                $updateData['receipt_no'] = $expenseData['receipt_no'];
            }
            if (isset($expenseData['notes'])) {
                $updateData['notes'] = $expenseData['notes'];
            }
            
            $expense->update($updateData);

            // Activity log
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logUpdate($expense);

            // İlişkileri yükle
            $expense->load(['createdBy', 'tenant']);

            return $expense;
        });
    }
}
