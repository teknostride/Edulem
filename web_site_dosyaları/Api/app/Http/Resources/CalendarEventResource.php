<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarEventResource extends JsonResource
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
            'event_type' => $this->event_type,
            'event_date' => $this->event_date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'location' => $this->location,
            'target_audience' => $this->target_audience,
            'is_all_day' => $this->is_all_day,
            'is_all_day_check' => $this->isAllDay(),
            'is_public' => $this->is_public,
            'is_public_check' => $this->isPublic(),
            'is_today' => $this->isToday(),
            'is_past' => $this->isPast(),
            'is_upcoming' => $this->isUpcoming(),
            'related_data' => $this->related_data,
            'notes' => $this->notes,
            'reminders' => $this->reminders,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'participants' => CalendarEventParticipantResource::collection($this->whenLoaded('participants')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
