<?php

namespace App\Http\Resources;

use App\Http\Resources\StudentResource;
use App\Http\Resources\TutoringSessionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TutoringSessionAttendanceResource extends JsonResource
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
            'tutoring_session_id' => $this->tutoring_session_id,
            'student_id' => $this->student_id,
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'notes' => $this->notes,
            'student' => $this->whenLoaded('student', fn() => new StudentResource($this->student)),
            'tutoring_session' => $this->whenLoaded('tutoringSession', fn() => new TutoringSessionResource($this->tutoringSession)),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Get status label in Turkish.
     *
     * @return string
     */
    protected function getStatusLabel(): string
    {
        return match ($this->status) {
            'present' => 'Geldi',
            'absent' => 'Gelmedi',
            'late' => 'Geç Geldi',
            default => $this->status,
        };
    }
}
