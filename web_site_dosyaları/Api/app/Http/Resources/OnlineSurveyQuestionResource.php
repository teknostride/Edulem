<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnlineSurveyQuestionResource extends JsonResource
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
            'online_survey' => $this->whenLoaded('onlineSurvey', fn() => new OnlineSurveyResource($this->onlineSurvey)),
            'question' => $this->question,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'is_required' => $this->is_required,
            'order' => $this->order,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
