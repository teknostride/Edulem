<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScholarshipDocumentTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'exam_entry_date' => $this->exam_entry_date?->format('Y-m-d'),
            'exam_entry_time' => $this->exam_entry_time ? substr((string) $this->exam_entry_time, 0, 5) : null,
            'school_name' => $this->school_name,
            'exam_address' => $this->exam_address,
            'notes' => $this->notes,
            'classrooms' => $this->whenLoaded('classrooms', function () {
                return $this->classrooms->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'education_level' => $c->educationLevel ? [
                        'id' => $c->educationLevel->id,
                        'name' => $c->educationLevel->name,
                    ] : null,
                ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
