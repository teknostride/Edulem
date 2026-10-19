<?php

namespace App\Http\Resources;

use App\Http\Resources\LessonResource;
use App\Http\Resources\HomeworkResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\TutoringSessionAttendanceResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TutoringSessionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $user = (is_object($request) && method_exists($request, 'user')) ? $request->user() : auth()->user();

        return [
            'id' => $this->id,
            'type' => $this->type,
            'type_label' => $this->getTypeLabel(),
            'title' => $this->title,
            'date' => $this->date?->format('Y-m-d'),
            'start_time' => $this->start_time?->format('H:i'),
            'end_time' => $this->end_time?->format('H:i'),
            'duration' => $this->duration,
            'room' => $this->room,
            'remote_link' => $this->when($this->hasRemoteLink(), $this->remote_link),
            'max_students' => $this->max_students,
            'available_spots' => $this->getAvailableSpots(),
            'is_full' => $this->isFull(),
            'weekly_max_count' => $this->weekly_max_count,
            'is_active' => $this->is_active,
            'lesson_id' => $this->lesson_id,
            'teacher_id' => $this->teacher_id,
            'classroom_id' => $this->classroom_id,
            'notes' => $this->when($user && ($user->is_superadmin || $user->hasAnyPermission(['tutoring.view_notes', 'tutoring.read', 'academic.read']) || ((int) $user->id === (int) $this->teacher_id)), $this->notes),
            'teacher' => $this->whenLoaded('teacher', fn() => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
                'email' => $this->teacher->email,
            ]),
            'lesson' => $this->whenLoaded('lesson', fn() => new LessonResource($this->lesson)),
            'homework' => $this->whenLoaded('homework', fn() => new HomeworkResource($this->homework)),
            'students' => StudentResource::collection($this->whenLoaded('students')),
            'students_count' => $this->whenLoaded('students', fn() => $this->students->count()),
            'attendances' => TutoringSessionAttendanceResource::collection($this->whenLoaded('attendances')),
            'attendance_summary' => $this->whenLoaded('attendances', fn() => [
                'taken' => $this->attendances->isNotEmpty(),
                'total' => $this->attendances->count(),
                'present' => $this->attendances->where('status', 'present')->count(),
                'absent' => $this->attendances->where('status', 'absent')->count(),
                'late' => $this->attendances->where('status', 'late')->count(),
                'rate' => ($this->attendances->count() > 0)
                    ? round(($this->attendances->where('status', 'present')->count() / $this->attendances->count()) * 100, 1)
                    : 0,
            ]),
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
     * Get human-readable type label.
     */
    protected function getTypeLabel(): string
    {
        return match ($this->type) {
            'tutoring' => 'Etüt',
            'extra_lesson' => 'Ek Ders',
            'private_lesson' => 'Özel Ders',
            'class_tutoring' => 'Sınıf Etütü',
            'seminar' => 'Seminer',
            default => ucfirst($this->type),
        };
    }
}