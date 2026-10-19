<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ContractResource extends ApiResource
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
            'contract_no' => $this->contract_no,
            'contract_date' => $this->contract_date->format('Y-m-d'),
            'status' => $this->status,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        $fields = $this->getPublicFields();
        
        $fields['total_amount'] = (float) $this->total_amount;
        $fields['start_date'] = $this->start_date->format('Y-m-d');
        $fields['end_date'] = $this->end_date?->format('Y-m-d');
        
        if ($this->relationLoaded('student') && $this->student) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
            ];
        }
        
        return $fields;
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        $fields['total_amount'] = (float) $this->total_amount;
        $fields['start_date'] = $this->start_date->format('Y-m-d');
        $fields['end_date'] = $this->end_date?->format('Y-m-d');
        $fields['terms'] = $this->terms;
        $fields['notes'] = $this->notes;
        
        if ($this->relationLoaded('student') && $this->student) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ];
        }
        
        if ($this->relationLoaded('file') && $this->file) {
            $fields['file'] = [
                'id' => $this->file->id,
                'name' => $this->file->original_name,
            ];
        }
        
        if ($this->relationLoaded('creator') && $this->creator) {
            $fields['created_by'] = [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ];
        }
        
        if ($this->relationLoaded('signedByGuardian') && $this->signedByGuardian) {
            $fields['signed_by_guardian'] = [
                'id' => $this->signedByGuardian->id,
                'name' => $this->signedByGuardian->name,
            ];
            $fields['signed_at'] = $this->signed_at?->format('Y-m-d H:i:s');
        }
        
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
