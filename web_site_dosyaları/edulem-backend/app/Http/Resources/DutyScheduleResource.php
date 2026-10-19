<?php

namespace App\Http\Resources;

class DutyScheduleResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $dayName = is_string($this->day_of_week) ? $this->day_of_week : null;

        return $this->filterFields([
            'id' => $this->id,
            'user_id' => $this->user_id,
            'campus_id' => $this->campus_id,
            'education_level_id' => $this->education_level_id,
            'day_of_week' => $this->mapDayOfWeekToNumber($dayName),
            'day_of_week_name' => $dayName,
            'start_time' => $this->start_time?->format('H:i') ?? (is_string($this->start_time) ? substr($this->start_time, 0, 5) : null),
            'end_time' => $this->end_time?->format('H:i') ?? (is_string($this->end_time) ? substr($this->end_time, 0, 5) : null),
            'location' => $this->location,
            'notes' => $this->notes,
            'is_active' => $this->is_active,
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'first_name' => $this->user->first_name,
                'last_name' => $this->user->last_name,
                'email' => $this->user->email,
            ] : null),
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i:s'),
        ]);
    }

    protected function getPublicFields(): array
    {
        return [
            'id', 'user_id', 'campus_id', 'education_level_id', 'day_of_week', 'day_of_week_name', 'start_time', 'end_time', 'location', 'is_active', 'user', 'created_at'
        ];
    }

    private function mapDayOfWeekToNumber(?string $dayName): ?int
    {
        if (!$dayName) {
            return null;
        }

        return match (strtolower($dayName)) {
            'monday' => 1,
            'tuesday' => 2,
            'wednesday' => 3,
            'thursday' => 4,
            'friday' => 5,
            'saturday' => 6,
            'sunday' => 7,
            default => is_numeric($dayName) ? (int) $dayName : null,
        };
    }

    protected function getTeacherFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    protected function getAllFields(): array
    {
        return array_merge($this->getPublicFields(), [
            'user', 'notes', 'updated_at'
        ]);
    }
}
