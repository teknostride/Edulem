<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamTopicRequest extends FormRequest
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
            'exam_id' => ['required', 'exists:exams,id'],
            'topic_name' => ['required', 'string', 'max:255'],
            'question_count' => ['sometimes', 'integer', 'min:0'],
            'total_points' => ['sometimes', 'integer', 'min:0'],
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
            'exam_id.required' => 'Sınav seçimi zorunludur.',
            'exam_id.exists' => 'Seçilen sınav bulunamadı.',
            'topic_name.required' => 'Konu adı zorunludur.',
            'topic_name.max' => 'Konu adı en fazla 255 karakter olabilir.',
            'question_count.integer' => 'Soru sayısı bir sayı olmalıdır.',
            'question_count.min' => 'Soru sayısı 0\'dan küçük olamaz.',
            'total_points.integer' => 'Toplam puan bir sayı olmalıdır.',
            'total_points.min' => 'Toplam puan 0\'dan küçük olamaz.',
        ];
    }
}
