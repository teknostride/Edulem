<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionTargetRequest extends FormRequest
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
            'student_id' => ['required', 'exists:students,id'],
            'week_start_date' => ['required', 'date'],
            'weekly_target' => ['required', 'integer', 'min:0'],
            'daily_targets' => ['nullable', 'array'],
            'daily_targets.monday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.tuesday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.wednesday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.thursday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.friday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.saturday' => ['nullable', 'integer', 'min:0'],
            'daily_targets.sunday' => ['nullable', 'integer', 'min:0'],
            'lesson_targets' => ['nullable', 'array'],
            'lesson_targets.*' => ['integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'student_id.required' => 'Öğrenci seçimi zorunludur.',
            'student_id.exists' => 'Seçilen öğrenci bulunamadı.',
            'week_start_date.required' => 'Hafta başlangıç tarihi zorunludur.',
            'weekly_target.required' => 'Haftalık hedef zorunludur.',
            'weekly_target.min' => 'Haftalık hedef 0 veya daha büyük olmalıdır.',
        ];
    }
}
