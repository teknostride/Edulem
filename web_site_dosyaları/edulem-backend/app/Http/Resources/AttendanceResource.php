<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AttendanceResource extends ApiResource
{
    /**
     * Get public fields (visible to all authenticated users).
     *
     * @return array<string, mixed>
     */
    protected function getPublicFields(): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'schedule_id' => $this->schedule_id,
            'date' => $this->date->format('Y-m-d'),
            'status' => $this->status,
            'is_administrative_leave' => $this->is_administrative_leave,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get teacher-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getTeacherFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('student') && $this->student) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ];
        }
        
        if ($this->relationLoaded('schedule') && $this->schedule) {
            $lessonName = null;
            if ($this->schedule->relationLoaded('lesson') && $this->schedule->lesson) {
                $lessonName = $this->schedule->lesson->name;
            }
            $fields['schedule'] = [
                'id' => $this->schedule->id,
                'lesson' => $lessonName,
                'day_of_week' => $this->schedule->day_of_week ?? null,
                'start_time' => $this->schedule->start_time ? $this->schedule->start_time->format('H:i') : null,
            ];
        }
        
        $fields['notes'] = $this->notes;
        $fields['is_administrative_leave'] = $this->is_administrative_leave;
        if ($this->is_administrative_leave) {
            $fields['administrative_leave_reason'] = $this->administrative_leave_reason;
        }
        
        return $fields;
    }

    /**
     * Get accountant-specific fields.
     *
     * @return array<string, mixed>
     */
    protected function getAccountantFields(): array
    {
        return $this->getPublicFields();
    }

    /**
     * Get all fields (for admin).
     *
     * @return array<string, mixed>
     */
    protected function getAllFields(): array
    {
        $fields = $this->getPublicFields();
        
        if ($this->relationLoaded('student') && $this->student) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ];
        }
        
        if ($this->relationLoaded('schedule') && $this->schedule) {
            $lessonName = null;
            if ($this->schedule->relationLoaded('lesson') && $this->schedule->lesson) {
                $lessonName = $this->schedule->lesson->name;
            }
            $fields['schedule'] = [
                'id' => $this->schedule->id,
                'lesson' => $lessonName,
                'day_of_week' => $this->schedule->day_of_week ?? null,
                'start_time' => $this->schedule->start_time ? $this->schedule->start_time->format('H:i') : null,
            ];
        }
        
        if ($this->relationLoaded('teacher') && $this->teacher) {
            $fields['teacher'] = [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ];
        }
        
        $fields['notes'] = $this->notes;
        $fields['is_administrative_leave'] = $this->is_administrative_leave;
        if ($this->is_administrative_leave) {
            $fields['administrative_leave_reason'] = $this->administrative_leave_reason;
        }
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
