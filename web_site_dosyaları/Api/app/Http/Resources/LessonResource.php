<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class LessonResource extends ApiResource
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
            'description' => $this->description,
            'schedule_count' => $this->whenLoaded('schedules', fn () => $this->schedules->count()),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ]);
    }

    protected function getPublicFields(): array
    {
        return [
            'id', 'name', 'code', 'description', 'created_at'
        ];
    }

    protected function getTeacherFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'schedule_count'
        ]);
    }

    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAllFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'schedule_count', 'updated_at'
        ]);
    }
}
