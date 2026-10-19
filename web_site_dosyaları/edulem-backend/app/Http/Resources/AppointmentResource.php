<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AppointmentResource extends ApiResource
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
            'name' => $this->name,
            'appointment_date' => $this->appointment_date->format('Y-m-d H:i:s'),
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
        $fields = $this->getPublicFields();
        
        $fields['phone'] = $this->phone;
        $fields['email'] = $this->email;
        
        return $fields;
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        $fields['phone'] = $this->phone;
        $fields['email'] = $this->email;
        $fields['notes'] = $this->notes;
        
        if ($this->relationLoaded('lead') && $this->lead) {
            $fields['lead'] = [
                'id' => $this->lead->id,
                'name' => $this->lead->name,
            ];
        }
        
        if ($this->relationLoaded('assignedUser') && $this->assignedUser) {
            $fields['assigned_to'] = [
                'id' => $this->assignedUser->id,
                'name' => $this->assignedUser->name,
            ];
        }
        
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
