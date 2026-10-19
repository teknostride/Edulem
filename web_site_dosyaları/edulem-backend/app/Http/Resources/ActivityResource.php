<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
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
            'category' => $this->category,
            'activity_date' => $this->activity_date?->format('Y-m-d'),
            'activity_time' => $this->activity_time,
            'location' => $this->location,
            'share_type' => $this->share_type,
            'target_student_ids' => $this->target_student_ids,
            'classroom' => $this->whenLoaded('classroom', fn() => new ClassroomResource($this->classroom)),
            'photo_file_ids' => $this->photo_file_ids,
            'video_file_ids' => $this->video_file_ids,
            'document_file_ids' => $this->document_file_ids,
            'is_published' => $this->is_published,
            'requires_admin_approval' => $this->requires_admin_approval,
            'is_admin_approved' => $this->is_admin_approved,
            'is_published_check' => $this->isPublished(),
            'requires_approval' => $this->requiresApproval(),
            'approver' => $this->whenLoaded('approver', fn() => [
                'id' => $this->approver->id,
                'name' => $this->approver->name,
            ]),
            'approved_at' => $this->approved_at?->toISOString(),
            'view_count' => $this->view_count,
            'like_count' => $this->like_count,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'participants' => ActivityParticipantResource::collection($this->whenLoaded('participants')),
            'student_participants' => ActivityParticipantResource::collection($this->whenLoaded('studentParticipants')),
            'user_participants' => ActivityParticipantResource::collection($this->whenLoaded('userParticipants')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
