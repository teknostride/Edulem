<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class PackageResource extends ApiResource
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
            'slug' => $this->slug,
            'description' => $this->description,
            'base_price' => (float) $this->base_price,
            'price_per_student' => (float) $this->price_per_student,
            'is_active' => $this->is_active,
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
        
        $fields['max_students'] = $this->max_students;
        $fields['max_users'] = $this->max_users;
        $fields['max_storage_gb'] = $this->max_storage_gb;
        $fields['modules'] = $this->modules ?? [];
        $fields['features'] = $this->features ?? [];
        $fields['sort_order'] = $this->sort_order;
        $fields['created_at'] = $this->created_at->format('Y-m-d H:i:s');
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
