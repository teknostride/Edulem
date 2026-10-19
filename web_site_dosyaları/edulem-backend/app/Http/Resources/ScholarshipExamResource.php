<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScholarshipExamResource extends JsonResource
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
            'exam_date' => $this->exam_date?->format('Y-m-d'),
            'exam_time' => $this->exam_time,
            'duration_minutes' => $this->duration_minutes,
            'sessions' => $this->sessions,
            'required_fields' => $this->required_fields,
            'optional_fields' => $this->optional_fields,
            'exam_specification_file' => $this->whenLoaded('examSpecificationFile', fn() => new FileResource($this->examSpecificationFile)),
            'scholarship_amount' => $this->scholarship_amount,
            'registration_fee' => $this->registration_fee,
            'auto_register_students' => $this->auto_register_students,
            'auto_register_to_leads' => $this->auto_register_to_leads,
            'multi_branch_application' => $this->multi_branch_application,
            'branch_ids' => $this->branch_ids,
            'require_security_code' => $this->require_security_code,
            'show_results_online' => $this->show_results_online,
            'results_publish_date' => $this->results_publish_date?->toISOString(),
            'status' => $this->status,
            'is_open' => $this->isOpen(),
            'has_ended' => $this->hasEnded(),
            'total_applications' => $this->getTotalApplications(),
            'approved_applications' => $this->getApprovedApplications(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'applications' => ScholarshipExamApplicationResource::collection($this->whenLoaded('applications')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
