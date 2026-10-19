<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MealMenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'menu_date' => $this->menu_date?->format('Y-m-d'),
            'meal_type' => $this->meal_type,
            'meals' => $this->meals,
            'target_student_ids' => $this->target_student_ids,
            'classroom_id' => $this->classroom_id,
            'classroom' => $this->whenLoaded('classroom', fn() => $this->classroom ? [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'grade_level' => $this->classroom->grade_level ?? null,
            ] : null),
            'notes' => $this->notes,
            'is_published' => (bool) $this->is_published,
            'is_published_check' => (bool) $this->is_published,
            'creator' => $this->whenLoaded('creator', fn() => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'attendances' => MealAttendanceResource::collection($this->whenLoaded('attendances')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
