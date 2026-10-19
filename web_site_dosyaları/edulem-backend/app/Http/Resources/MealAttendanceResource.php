<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MealAttendanceResource extends JsonResource
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
            'meal_menu' => $this->whenLoaded('mealMenu', fn() => $this->mealMenu ? new MealMenuResource($this->mealMenu) : null),
            'student' => $this->whenLoaded('student', fn() => $this->student ? new StudentResource($this->student) : null),
            'attendance_date' => $this->attendance_date?->format('Y-m-d'),
            'meal_type' => $this->meal_type,
            'status' => $this->status,
            'is_present' => $this->isPresent(),
            'is_absent' => $this->isAbsent(),
            'is_excused' => $this->isExcused(),
            'notes' => $this->notes,
            'recorder' => $this->whenLoaded('recorder', fn() => $this->recorder ? [
                'id' => $this->recorder->id,
                'name' => $this->recorder->name,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
