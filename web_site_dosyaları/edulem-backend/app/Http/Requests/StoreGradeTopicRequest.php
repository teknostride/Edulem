<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGradeTopicRequest extends FormRequest
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
            'grade_id' => ['required', 'exists:grades,id'],
            'topic_name' => ['required', 'string', 'max:255'],
            'question_number' => ['nullable', 'integer', 'min:1'],
            'question_count' => ['sometimes', 'integer', 'min:0'],
            'points' => ['sometimes', 'numeric', 'min:0'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
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
            'grade_id.required' => 'Not seçimi zorunludur.',
            'grade_id.exists' => 'Seçilen not bulunamadı.',
            'topic_name.required' => 'Konu adı zorunludur.',
            'topic_name.max' => 'Konu adı en fazla 255 karakter olabilir.',
            'question_number.integer' => 'Soru numarası bir sayı olmalıdır.',
            'question_count.integer' => 'Soru sayısı bir sayı olmalıdır.',
            'points.numeric' => 'Puan bir sayı olmalıdır.',
        ];
    }
}
