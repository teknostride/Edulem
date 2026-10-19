<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScholarshipExamApplicationResource extends JsonResource
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
            'scholarship_exam' => $this->whenLoaded('scholarshipExam', fn() => new ScholarshipExamResource($this->scholarshipExam)),
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'lead' => $this->whenLoaded('lead', fn() => new LeadResource($this->lead)),
            'application_number' => $this->application_number,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'tc_identity_number' => $this->tc_identity_number,
            'school_name' => $this->school_name,
            'grade_level' => $this->grade_level,
            'branch' => $this->whenLoaded('branch', fn() => new ClassroomResource($this->branch)),
            'session_id' => $this->session_id,
            'session_time' => $this->session_time,
            'classroom' => $this->whenLoaded('classroom', fn() => new ClassroomResource($this->classroom)),
            'seat_number' => $this->seat_number,
            'optical_form_code' => $this->optical_form_code,
            'additional_data' => $this->additional_data,
            'status' => $this->status,
            'is_approved' => $this->isApproved(),
            'is_pending' => $this->isPending(),
            'notes' => $this->notes,
            'processor' => $this->whenLoaded('processor', fn() => [
                'id' => $this->processor->id,
                'name' => $this->processor->name,
            ]),
            'processed_at' => $this->processed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
