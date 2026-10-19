<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'in:trip,music,drama,guidance,sports,art,science,other'],
            'activity_date' => ['required', 'date'],
            'activity_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'share_type' => ['nullable', 'in:single_student,target_group,all'],
            'target_student_ids' => ['nullable', 'array'],
            'target_student_ids.*' => ['exists:students,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'photo_file_ids' => ['nullable', 'array'],
            'photo_file_ids.*' => ['exists:files,id'],
            'video_file_ids' => ['nullable', 'array'],
            'video_file_ids.*' => ['exists:files,id'],
            'document_file_ids' => ['nullable', 'array'],
            'document_file_ids.*' => ['exists:files,id'],
            'is_published' => ['boolean'],
            'requires_admin_approval' => ['boolean'],
        ];
    }
}
