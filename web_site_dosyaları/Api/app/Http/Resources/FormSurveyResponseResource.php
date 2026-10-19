<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormSurveyResponseResource extends JsonResource
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
            'form_survey' => $this->whenLoaded('formSurvey', fn() => new FormSurveyResource($this->formSurvey)),
            'respondent' => $this->whenLoaded('respondent', fn() => [
                'id' => $this->respondent->id,
                'name' => $this->respondent->name,
                'email' => $this->respondent->email,
            ]),
            'respondent_type' => $this->respondent_type,
            'answers' => $this->answers,
            'notes' => $this->notes,
            'is_anonymous' => $this->is_anonymous,
            'is_anonymous_check' => $this->isAnonymous(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
