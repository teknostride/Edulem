<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScholarshipExamSeatingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'classroom_ids' => ['required', 'array', 'min:1'],
            'classroom_ids.*' => ['exists:classrooms,id'],
            'session_id' => ['sometimes', 'string'],
            'shuffle' => ['sometimes', 'boolean'],
            'same_school_apart' => ['sometimes', 'boolean'],
            'same_grade_apart' => ['sometimes', 'boolean'],
            'capacity' => ['sometimes', 'array'],
            'capacity.*' => ['integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'classroom_ids.required' => 'En az bir derslik seçilmelidir.',
            'classroom_ids.array' => 'Derslikler dizi formatında olmalıdır.',
            'classroom_ids.min' => 'En az bir derslik seçilmelidir.',
        ];
    }
}
