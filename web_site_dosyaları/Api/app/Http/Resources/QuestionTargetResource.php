<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionTargetResource extends JsonResource
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
            'week_start_date' => $this->week_start_date?->format('Y-m-d'),
            'week_end_date' => $this->getWeekEndDate()->format('Y-m-d'),
            'weekly_target' => $this->weekly_target,
            'daily_targets' => $this->daily_targets,
            'lesson_targets' => $this->lesson_targets,
            'total_solved' => $this->getTotalSolved(),
            'completion_percentage' => round($this->getCompletionPercentage(), 2),
            'daily_solved' => $this->getDailySolved(),
            'lesson_solved' => $this->getLessonSolved(),
            'notes' => $this->notes,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'question_counts' => StudentQuestionCountResource::collection($this->whenLoaded('questionCounts')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
