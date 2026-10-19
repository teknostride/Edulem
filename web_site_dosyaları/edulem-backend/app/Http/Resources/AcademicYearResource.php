<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AcademicYearResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return $this->filterFields([
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'is_active' => $this->is_active,
            'is_currently_active' => $this->isCurrentlyActive(),
            'description' => $this->description,
            'students_count' => $this->whenLoaded('students', fn() => $this->students->count()),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ]);
    }

    protected function getPublicFields(): array
    {
        return [
            'id', 'name', 'code', 'start_date', 'end_date', 'is_active', 'is_currently_active', 'created_at'
        ];
    }

    protected function getTeacherFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'students_count'
        ]);
    }

    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAllFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'description', 'students_count', 'updated_at'
        ]);
    }
}
