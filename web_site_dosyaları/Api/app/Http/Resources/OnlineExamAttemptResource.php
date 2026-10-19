<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlineExamAttemptResource extends JsonResource
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
            'online_exam' => $this->whenLoaded('onlineExam', fn() => new OnlineExamResource($this->onlineExam)),
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'started_at' => $this->started_at?->toISOString(),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'time_spent_seconds' => $this->time_spent_seconds,
            'remaining_time_seconds' => $this->getRemainingTimeSeconds(),
            'remaining_time_formatted' => $this->getRemainingTimeFormatted(),
            'answered_count' => $this->answered_count,
            'correct_count' => $this->correct_count,
            'wrong_count' => $this->wrong_count,
            'empty_count' => $this->empty_count,
            'score' => $this->score,
            'percentage' => $this->percentage,
            'status' => $this->status,
            'is_expired' => $this->isExpired(),
            'is_in_progress' => $this->isInProgress(),
            'notes' => $this->notes,
            'answers' => OnlineExamAnswerResource::collection($this->whenLoaded('answers')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
