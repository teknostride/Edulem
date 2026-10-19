<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentQuestionCountResource extends JsonResource
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
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'question_target' => $this->whenLoaded('questionTarget', fn() => new QuestionTargetResource($this->questionTarget)),
            'date' => $this->date?->format('Y-m-d'),
            'count' => $this->count,
            'lesson' => $this->whenLoaded('lesson', fn() => new LessonResource($this->lesson)),
            'notes' => $this->notes,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
