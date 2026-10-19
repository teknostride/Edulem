<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class FinancialResource extends ApiResource
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
            'student_id' => $this->student_id,
            'student_name' => $this->student?->name,
        ];
    }

    /**
     * Get teacher-specific fields (borç, tahsilat görmez).
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        // Öğretmen finansal bilgileri göremez
        return $this->getPublicFields();
    }

    /**
     * Get accountant-specific fields (borç, tahsilat).
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'debt' => $this->debt,
            'payment' => $this->payment,
            'payment_date' => $this->payment_date,
            'payment_method' => $this->payment_method,
            'installment_number' => $this->installment_number,
            'total_installments' => $this->total_installments,
            'status' => $this->status,
        ]);
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
            'student_id' => $this->student_id,
            'student_name' => $this->student?->name,
            'debt' => $this->debt,
            'payment' => $this->payment,
            'payment_date' => $this->payment_date,
            'payment_method' => $this->payment_method,
            'installment_number' => $this->installment_number,
            'total_installments' => $this->total_installments,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
