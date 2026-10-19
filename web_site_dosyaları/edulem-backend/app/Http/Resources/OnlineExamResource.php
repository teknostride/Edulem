<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlineExamResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'lesson' => $this->whenLoaded('lesson', fn() => new LessonResource($this->lesson)),
            'classroom' => $this->whenLoaded('classroom', fn() => new ClassroomResource($this->classroom)),
            'question_ids' => $this->question_ids,
            'question_count' => $this->question_count,
            'duration_minutes' => $this->duration_minutes,
            'total_points' => $this->total_points,
            'scoring_formula' => $this->scoring_formula,
            'points_per_question' => $this->points_per_question,
            'negative_points' => $this->negative_points,
            'start_time' => $this->start_time?->toISOString(),
            'end_time' => $this->end_time?->toISOString(),
            'single_attempt' => $this->single_attempt,
            'allow_retake' => $this->allow_retake,
            'max_attempts' => $this->max_attempts,
            'auto_submit' => $this->auto_submit,
            'show_results_immediately' => $this->show_results_immediately,
            'show_correct_answers' => $this->show_correct_answers,
            'shuffle_questions' => $this->shuffle_questions,
            'shuffle_options' => $this->shuffle_options,
            'status' => $this->status,
            'is_active' => $this->isActive(),
            'is_published' => $this->isPublished(),
            'has_started' => $this->hasStarted(),
            'has_ended' => $this->hasEnded(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'attempts' => OnlineExamAttemptResource::collection($this->whenLoaded('attempts')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
