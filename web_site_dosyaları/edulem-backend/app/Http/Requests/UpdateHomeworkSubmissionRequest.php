<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHomeworkSubmissionRequest extends FormRequest
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
            'score' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'teacher_notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', 'string', Rule::in(['pending', 'submitted', 'graded', 'returned'])],
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
            'score.numeric' => 'Puan sayısal bir değer olmalıdır.',
            'score.min' => 'Puan 0\'dan küçük olamaz.',
            'score.max' => 'Puan 100\'den büyük olamaz.',
            'teacher_notes.max' => 'Öğretmen notları en fazla 2000 karakter olabilir.',
            'status.in' => 'Geçerli bir durum seçiniz.',
        ];
    }
}
