<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class NotificationResource extends ApiResource
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
            'type' => $this->type,
            'read_at' => $this->read_at?->format('Y-m-d H:i:s'),
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
        $fields['data'] = $this->data;
        return $fields;
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        $fields = $this->getPublicFields();
        $fields['data'] = $this->data;
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
        $fields['data'] = $this->data;
        $fields['read_at'] = $this->read_at?->format('Y-m-d H:i:s');
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        return $fields;
    }
}
