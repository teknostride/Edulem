<?php

namespace App\Http\Resources;

use App\Http\Resources\ExamClassroomResource;
use Illuminate\Http\Request;

class ExamResource extends ApiResource
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
            'name' => $this->name,
            'exam_date' => $this->exam_date->format('Y-m-d H:i:s'),
            'type' => $this->type,
            'is_active' => $this->is_active,
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
        
        if ($this->relationLoaded('lesson')) {
            $fields['lesson'] = [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ];
        }
        
        if ($this->relationLoaded('classroom') && $this->classroom) {
            $fields['classroom'] = [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ];
        }
        
        $fields['description'] = $this->description;
        $fields['duration_minutes'] = $this->duration_minutes;
        $fields['total_points'] = $this->total_points;
        
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
        
        if ($this->relationLoaded('lesson')) {
            $fields['lesson'] = [
                'id' => $this->lesson->id,
                'name' => $this->lesson->name,
                'code' => $this->lesson->code,
            ];
        }
        
        if ($this->relationLoaded('classroom') && $this->classroom) {
            $fields['classroom'] = [
                'id' => $this->classroom->id,
                'name' => $this->classroom->name,
                'code' => $this->classroom->code,
            ];
        }
        
        $fields['description'] = $this->description;
        $fields['duration_minutes'] = $this->duration_minutes;
        $fields['total_points'] = $this->total_points;
        $fields['is_optical_form'] = $this->is_optical_form;
        $fields['is_optical_form_exam'] = $this->isOpticalForm();
        if ($this->is_optical_form) {
            $fields['optical_form_status'] = $this->optical_form_status;
        }
        if ($this->relationLoaded('scoreCoefficients')) {
            $fields['score_coefficients'] = $this->scoreCoefficients;
        }
        if ($this->relationLoaded('topics')) {
            $fields['topics'] = $this->topics;
        }
        if ($this->relationLoaded('examClassrooms')) {
            $fields['exam_classrooms'] = ExamClassroomResource::collection($this->examClassrooms);
        }
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
