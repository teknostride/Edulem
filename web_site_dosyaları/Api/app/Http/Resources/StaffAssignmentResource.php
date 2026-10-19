<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffAssignmentResource extends JsonResource
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
            'assignment_type' => $this->assignment_type,
            'assigned_staff_ids' => $this->assigned_staff_ids,
            'assigned_staff' => $this->assignedStaff()->map(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]),
            'team_leader' => $this->whenLoaded('teamLeader', fn() => [
                'id' => $this->teamLeader->id,
                'name' => $this->teamLeader->name,
                'email' => $this->teamLeader->email,
            ]),
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'deadline' => $this->deadline?->format('Y-m-d'),
            'completion_percentage' => $this->completion_percentage,
            'status' => $this->status,
            'is_pending' => $this->isPending(),
            'is_in_progress' => $this->isInProgress(),
            'is_completed' => $this->isCompleted(),
            'is_overdue' => $this->isOverdue(),
            'is_active' => $this->isActive(),
            'related_data' => $this->related_data,
            'notes' => $this->notes,
            'show_in_calendar' => $this->show_in_calendar,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
