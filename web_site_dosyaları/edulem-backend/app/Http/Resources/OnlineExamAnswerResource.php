<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlineExamAnswerResource extends JsonResource
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
            'online_exam_attempt' => $this->whenLoaded('onlineExamAttempt', fn() => new OnlineExamAttemptResource($this->onlineExamAttempt)),
            'online_exam' => $this->whenLoaded('onlineExam', fn() => new OnlineExamResource($this->onlineExam)),
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'question_id' => $this->question_id,
            'question_order' => $this->question_order,
            'answer' => $this->answer,
            'correct_answer' => $this->correct_answer,
            'is_correct' => $this->is_correct,
            'points_earned' => $this->points_earned,
            'time_spent_seconds' => $this->time_spent_seconds,
            'answered_at' => $this->answered_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
