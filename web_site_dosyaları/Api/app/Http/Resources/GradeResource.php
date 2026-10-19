<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class GradeResource extends ApiResource
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
            'grade' => (float) $this->grade,
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
        
        if ($this->relationLoaded('student')) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ];
        }
        
        if ($this->relationLoaded('exam')) {
            $fields['exam'] = [
                'id' => $this->exam->id,
                'name' => $this->exam->name,
                'type' => $this->exam->type,
            ];
        }
        
        $fields['grade_type'] = $this->grade_type;
        $fields['semester'] = $this->semester;
        $fields['notes'] = $this->notes;
        
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
        
        if ($this->relationLoaded('student')) {
            $fields['student'] = [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'school_no' => $this->student->school_no,
            ];
        }
        
        if ($this->relationLoaded('exam')) {
            $fields['exam'] = [
                'id' => $this->exam->id,
                'name' => $this->exam->name,
                'type' => $this->exam->type,
                'total_points' => $this->exam->total_points,
            ];
        }
        
        if ($this->relationLoaded('teacher')) {
            $fields['teacher'] = [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ];
        }
        
        $fields['grade_type'] = $this->grade_type;
        $fields['is_written'] = $this->isWritten();
        $fields['is_oral'] = $this->isOral();
        $fields['semester'] = $this->semester;
        $fields['is_first_semester'] = $this->isFirstSemester();
        $fields['is_second_semester'] = $this->isSecondSemester();
        $fields['score'] = $this->score ? (float) $this->score : null;
        if ($this->question_topics) {
            $fields['question_topics'] = $this->question_topics;
        }
        if ($this->relationLoaded('topics')) {
            $fields['topics'] = $this->topics;
        }
        if ($this->relationLoaded('achievements')) {
            $fields['achievements'] = $this->achievements;
        }
        $fields['notes'] = $this->notes;
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
