<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ScheduleResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return $this->filterFields([
            'id' => $this->id,
            'day_of_week' => $this->day_of_week,
            'start_time' => $this->start_time?->format('H:i'),
            'end_time' => $this->end_time?->format('H:i'),
            'room' => $this->room,
            'remote_link' => $this->remote_link,
            'has_remote_link' => $this->hasRemoteLink(),
            'program_type' => $this->program_type,
            'is_double_program' => $this->isDoubleProgram(),
            'program_id' => $this->program_id,
            'notes' => $this->notes,
            'classroom' => $this->whenLoaded('classroom', fn () => [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ]),
            'lesson' => $this->whenLoaded('lesson', fn () => [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ]),
            'teacher' => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ]),
            'assistant_teachers' => $this->when($this->assistant_teacher_ids, function () {
                return $this->assistantTeachers()->map(function ($teacher) {
                    return [
                        'id' => $teacher->id,
                        'name' => $teacher->name,
                    ];
                });
            }),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ]);
    }

    protected function getPublicFields(): array
    {
        return [
            'id', 'day_of_week', 'start_time', 'end_time', 'room', 'created_at'
        ];
    }

    protected function getTeacherFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'classroom', 'lesson', 'teacher', 'remote_link', 'has_remote_link', 'program_type', 'notes'
        ]);
    }

    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAllFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'classroom', 'lesson', 'teacher', 'assistant_teachers', 'remote_link', 'has_remote_link',
            'program_type', 'is_double_program', 'program_id', 'notes', 'updated_at'
        ]);
    }
}
