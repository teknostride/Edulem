<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ClassroomResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return parent::toArray($request);
    }

    protected function getPublicFields(): array
    {
        return [
            'id', 'name', 'code', 'capacity', 'grade_level', 'is_active', 'created_at'
        ];
    }

    protected function getTeacherFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'teacher', 'student_count'
        ]);
    }

    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAllFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'teacher', 'student_count', 'updated_at'
        ]);
    }
}
