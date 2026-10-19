<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionBankTopicResource extends JsonResource
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
            'name' => $this->name,
            'description' => $this->description,
            'lesson' => $this->whenLoaded('lesson', fn() => [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
            ]),
            'order' => $this->order,
            'is_active' => $this->is_active,
            'is_active_check' => $this->isActive(),
            'questions_count' => $this->whenLoaded('questions', fn() => $this->questions->count()),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
