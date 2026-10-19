<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamClassroomResource extends JsonResource
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
            'exam_id' => $this->exam_id,
            'classroom' => $this->whenLoaded('classroom', fn() => [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
                'capacity' => $this->classroom->capacity,
            ]),
            'student_count' => $this->student_count,
            'capacity' => $this->capacity,
            'available_capacity' => $this->getAvailableCapacity(),
            'is_full' => $this->isFull(),
            'order' => $this->order,
            'notes' => $this->notes,
            'students' => ExamClassroomStudentResource::collection($this->whenLoaded('students')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
