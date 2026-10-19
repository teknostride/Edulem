<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CurriculumTrackingResource extends JsonResource
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
            'lesson' => $this->whenLoaded('lesson', fn() => new LessonResource($this->lesson)),
            'classroom' => $this->whenLoaded('classroom', fn() => new ClassroomResource($this->classroom)),
            'teacher' => $this->whenLoaded('teacher', fn() => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ]),
            'teaching_date' => $this->teaching_date?->format('Y-m-d'),
            'topic' => $this->topic,
            'topic_description' => $this->topic_description,
            'lesson_hour' => $this->lesson_hour,
            'notes' => $this->notes,
            'materials' => $this->materials,
            'activities' => $this->activities,
            'is_completed' => $this->is_completed,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
