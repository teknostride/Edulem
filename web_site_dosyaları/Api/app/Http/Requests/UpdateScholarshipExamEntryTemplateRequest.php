<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScholarshipExamEntryTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'school_name' => ['sometimes', 'string', 'max:255'],
            'exam_address' => ['sometimes', 'string'],
            'selected_grade_levels' => ['sometimes', 'array'],
            'selected_grade_levels.*' => ['string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
