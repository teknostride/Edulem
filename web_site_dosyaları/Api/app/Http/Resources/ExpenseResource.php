<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ExpenseResource extends ApiResource
{
    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    protected function getPublicFields(): array
    {
        return [
            'id' => $this->id,
            'expense_category' => $this->category ?? $this->expense_category ?? 'other',
            'amount' => (float) $this->amount,
            'expense_date' => $this->expense_date->format('Y-m-d'),
            'description' => $this->description,
        ];
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        return [
            'id' => $this->id,
            'expense_category' => $this->category ?? $this->expense_category ?? 'other',
            'amount' => (float) $this->amount,
            'expense_date' => $this->expense_date->format('Y-m-d'),
            'description' => $this->description,
        ];
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return $this->getAllFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        return [
            'id' => $this->id,
            'expense_category' => $this->category ?? $this->expense_category ?? 'other',
            'amount' => (float) $this->amount,
            'expense_date' => $this->expense_date->format('Y-m-d'),
            'description' => $this->description,
            'payment_method' => $this->payment_method,
            'receipt_no' => $this->receipt_no,
            'notes' => $this->notes,
            'created_by' => $this->paidBy ? [
                'id' => $this->paidBy->id,
                'name' => $this->paidBy->name,
            ] : null,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
