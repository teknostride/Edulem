<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class SmsTemplateResource extends ApiResource
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
            'content' => $this->content,
            'variables' => $this->variables ?? $this->getAvailableVariables(),
            'code' => $this->code,
            'type' => $this->type,
            'is_active' => $this->is_active,
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
        
        if ($this->relationLoaded('creator') && $this->creator) {
            $fields['creator'] = [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ];
        }
        
        $fields['content'] = $this->content;
        $fields['variables'] = $this->variables ?? $this->getAvailableVariables();
        $fields['description'] = $this->description;
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
