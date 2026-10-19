<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGradeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by policy in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'grade_type' => ['sometimes', 'string', Rule::in(['written', 'oral', 'quiz', 'kds', 'uds', 'checkup'])],
            'semester' => ['sometimes', 'string', Rule::in(['first', 'second'])],
            'grade' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'score' => ['nullable', 'numeric', 'min:0'],
            'answers' => ['nullable', 'array'],
            'question_topics' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'grade.required' => 'Not zorunludur.',
            'grade.numeric' => 'Not bir sayı olmalıdır.',
            'grade.min' => 'Not en az 0 olabilir.',
            'grade.max' => 'Not en fazla 100 olabilir.',
            'notes.max' => 'Notlar en fazla 1000 karakter olabilir.',
        ];
    }
}
