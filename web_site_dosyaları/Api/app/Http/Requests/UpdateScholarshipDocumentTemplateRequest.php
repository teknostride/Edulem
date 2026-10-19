<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScholarshipDocumentTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'exam_entry_date' => ['sometimes', 'date'],
            'exam_entry_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'school_name' => ['sometimes', 'string', 'max:255'],
            'exam_address' => ['sometimes', 'string'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'classroom_ids' => ['sometimes', 'array', 'min:1'],
            'classroom_ids.*' => ['integer', 'exists:classrooms,id'],
        ];
    }
}
