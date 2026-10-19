<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class InvoiceResource extends ApiResource
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
            'invoice_no' => $this->invoice_no,
            'invoice_type' => $this->invoice_type,
            'amount' => (float) ($this->amount ?? $this->total_amount ?? 0),
            'due_date' => $this->due_date->format('Y-m-d'),
            'status' => $this->status,
            'student' => $this->student ? [
                'id' => $this->student->id,
                'name' => $this->student->name,
            ] : null,
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
            'invoice_no' => $this->invoice_no,
            'invoice_type' => $this->invoice_type,
            'amount' => (float) ($this->amount ?? $this->total_amount ?? 0),
            'due_date' => $this->due_date->format('Y-m-d'),
            'status' => $this->status,
            'student' => $this->student ? [
                'id' => $this->student->id,
                'name' => $this->student->name,
            ] : null,
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
            'invoice_no' => $this->invoice_no,
            'invoice_type' => $this->invoice_type,
            'amount' => (float) ($this->amount ?? $this->total_amount ?? 0),
            'due_date' => $this->due_date->format('Y-m-d'),
            'status' => $this->status,
            'description' => $this->description,
            'items' => $this->items,
            'paid_at' => $this->paid_at?->format('Y-m-d H:i:s'),
            'student' => $this->student ? [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ] : null,
            'created_by' => $this->createdBy ? [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ] : null,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
