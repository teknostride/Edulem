<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuidanceNoteResource extends JsonResource
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
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'counselor' => $this->whenLoaded('counselor', fn() => [
                'id' => $this->counselor->id,
                'name' => $this->counselor->name,
            ]),
            'appointment' => $this->whenLoaded('appointment', fn() => new AppointmentResource($this->appointment)),
            'title' => $this->title,
            'content' => $this->content,
            'type' => $this->type,
            'note_date' => $this->note_date?->format('Y-m-d'),
            'note_time' => $this->note_time,
            'is_visible_to_guardian' => $this->is_visible_to_guardian,
            'is_confidential' => $this->is_confidential,
            'requires_admin_review' => $this->requires_admin_review,
            'is_admin_approved' => $this->is_admin_approved,
            'approver' => $this->whenLoaded('approver', fn() => [
                'id' => $this->approver->id,
                'name' => $this->approver->name,
            ]),
            'approved_at' => $this->approved_at?->toISOString(),
            'tags' => $this->tags,
            'attachments' => $this->attachments,
            'follow_up_notes' => $this->follow_up_notes,
            'follow_up_date' => $this->follow_up_date?->format('Y-m-d'),
            'is_visible_to_guardian_check' => $this->isVisibleToGuardian(),
            'requires_review' => $this->requiresReview(),
            'is_approved' => $this->isApproved(),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
