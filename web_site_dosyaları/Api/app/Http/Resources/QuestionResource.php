<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class QuestionResource extends ApiResource
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
            'subject' => $this->subject,
            'status' => $this->status,
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
            ];
        }
        
        $fields['message'] = $this->message;
        
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
        
        if ($this->relationLoaded('guardian') && $this->guardian) {
            $fields['guardian'] = [
                'id' => $this->guardian->id,
                'name' => $this->guardian->name,
            ];
        }
        
        if ($this->relationLoaded('assignedUser') && $this->assignedUser) {
            $fields['assigned_to'] = [
                'id' => $this->assignedUser->id,
                'name' => $this->assignedUser->name,
            ];
        }
        
        if ($this->relationLoaded('respondedBy') && $this->respondedBy) {
            $fields['responded_by'] = [
                'id' => $this->respondedBy->id,
                'name' => $this->respondedBy->name,
            ];
            $fields['responded_at'] = $this->responded_at ? $this->responded_at->format('Y-m-d H:i:s') : null;
        }
        
        $fields['message'] = $this->message;
        $fields['has_audio'] = $this->hasAudio();
        if ($this->relationLoaded('audioFile') && $this->audioFile) {
            $fields['audio_file'] = [
                'id' => $this->audioFile->id,
                'name' => $this->audioFile->original_name,
                'path' => $this->audioFile->path,
            ];
        }
        $fields['response'] = $this->response;
        $fields['updated_at'] = $this->updated_at->format('Y-m-d H:i:s');
        
        return $fields;
    }
}
