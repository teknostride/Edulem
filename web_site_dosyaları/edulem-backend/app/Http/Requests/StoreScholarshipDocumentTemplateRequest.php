<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScholarshipDocumentTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'exam_entry_date' => ['required', 'date'],
            'exam_entry_time' => ['nullable', 'date_format:H:i'],
            'school_name' => ['required', 'string', 'max:255'],
            'exam_address' => ['required', 'string'],
            'notes' => ['nullable', 'string'],
            'classroom_ids' => ['required', 'array', 'min:1'],
            'classroom_ids.*' => ['integer', 'exists:classrooms,id'],
        ];
    }
}
