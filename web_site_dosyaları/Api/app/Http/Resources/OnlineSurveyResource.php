<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlineSurveyResource extends JsonResource
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
            'target_audience' => $this->target_audience,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'is_active' => $this->is_active,
            'is_active_check' => $this->isActive(),
            'has_started' => $this->hasStarted(),
            'has_ended' => $this->hasEnded(),
            'allow_anonymous' => $this->allow_anonymous,
            'show_results' => $this->show_results,
            'is_required' => $this->is_required,
            'question_count' => $this->question_count,
            'total_responses' => $this->getTotalResponses(),
            'has_user_responded' => $this->hasUserResponded(auth()->id()),
            'has_student_responded' => $this->hasStudentResponded(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'questions' => OnlineSurveyQuestionResource::collection($this->whenLoaded('questions')),
            'responses' => OnlineSurveyResponseResource::collection($this->whenLoaded('responses')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
