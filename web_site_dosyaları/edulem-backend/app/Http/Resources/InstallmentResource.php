<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class InstallmentResource extends ApiResource
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
            'total_amount' => (float) $this->total_amount,
            'installment_count' => $this->installment_count,
            'installment_amount' => (float) $this->installment_amount,
            'start_date' => $this->start_date->format('Y-m-d'),
            'status' => $this->status,
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
            ],
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
            'total_amount' => (float) $this->total_amount,
            'installment_count' => $this->installment_count,
            'start_date' => $this->start_date->format('Y-m-d'),
            'status' => $this->status,
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
            ],
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
        $paidCount = $this->installmentPayments->where('status', 'paid')->count();
        $pendingCount = $this->installmentPayments->where('status', 'pending')->count();
        $paidAmount = $this->installmentPayments->where('status', 'paid')->sum('amount');
        $remainingAmount = $this->total_amount - $paidAmount;

        return [
            'id' => $this->id,
            'total_amount' => (float) $this->total_amount,
            'installment_count' => $this->installment_count,
            'installment_amount' => (float) $this->installment_amount,
            'start_date' => $this->start_date->format('Y-m-d'),
            'status' => $this->status,
            'notes' => $this->notes,
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ],
            'statistics' => [
                'paid_count' => $paidCount,
                'pending_count' => $pendingCount,
                'paid_amount' => (float) $paidAmount,
                'remaining_amount' => (float) $remainingAmount,
            ],
            'installment_payments' => $this->installmentPayments->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'installment_number' => $payment->installment_number,
                    'amount' => (float) $payment->amount,
                    'due_date' => $payment->due_date->format('Y-m-d'),
                    'status' => $payment->status,
                    'paid_at' => $payment->paid_at?->format('Y-m-d'),
                ];
            }),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
