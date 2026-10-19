<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarEventParticipantResource extends JsonResource
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
            'calendar_event' => $this->whenLoaded('calendarEvent', fn() => new CalendarEventResource($this->calendarEvent)),
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'guardian' => $this->whenLoaded('guardian', fn() => new GuardianResource($this->guardian)),
            'participant_type' => $this->participant_type,
            'status' => $this->status,
            'is_pending' => $this->isPending(),
            'is_accepted' => $this->isAccepted(),
            'is_declined' => $this->isDeclined(),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
