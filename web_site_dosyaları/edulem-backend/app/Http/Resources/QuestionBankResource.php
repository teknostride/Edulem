<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionBankResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Doğru cevabı sadece yetkili kullanıcılar görebilir
        $showAnswer = $request->user()?->hasPermission('academic.read') || $request->user()?->is_superadmin;

        return [
            'id' => $this->id,
            'question_text' => $this->question_text,
            'question_image_url' => $this->question_image_url,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'correct_answer' => $this->when($showAnswer, $this->correct_answer),
            'correct_answers' => $this->when($showAnswer, $this->correct_answers),
            'explanation' => $this->when($showAnswer, $this->explanation),
            'topic' => $this->whenLoaded('topic', fn() => new QuestionBankTopicResource($this->topic)),
            'lesson' => $this->whenLoaded('lesson', fn() => [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
            ]),
            'difficulty_level' => $this->difficulty_level,
            'estimated_time_minutes' => $this->estimated_time_minutes,
            'points' => $this->points,
            'school_type' => $this->school_type,
            'grade_level' => $this->grade_level,
            'tags' => $this->tags,
            'related_question_ids' => $this->related_question_ids,
            'usage_count' => $this->usage_count,
            'last_used_at' => $this->last_used_at?->format('Y-m-d'),
            'has_been_used_recently' => $this->hasBeenUsedRecently(),
            'is_active' => $this->is_active,
            'is_active_check' => $this->isActive(),
            'is_public' => $this->is_public,
            'is_public_check' => $this->isPublic(),
            'usage_history' => $this->whenLoaded('usageHistory', fn() => $this->usageHistory->map(function ($history) {
                return [
                    'id' => $history->id,
                    'usage_type' => $history->usage_type,
                    'related_id' => $history->related_id,
                    'used_at' => $history->used_at?->format('Y-m-d'),
                ];
            })),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
