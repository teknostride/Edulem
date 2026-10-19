<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuestionRequest extends FormRequest
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
            'student_id' => ['nullable', 'exists:students,id'],
            'guardian_id' => ['nullable', 'exists:guardians,id'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'audio_file_id' => ['nullable', 'exists:files,id'],
            'status' => ['sometimes', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
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
            'student_id.exists' => 'Seçilen öğrenci bulunamadı.',
            'guardian_id.exists' => 'Seçilen veli bulunamadı.',
            'subject.required' => 'Konu zorunludur.',
            'subject.max' => 'Konu en fazla 255 karakter olabilir.',
            'message.required' => 'Mesaj zorunludur.',
            'message.max' => 'Mesaj en fazla 5000 karakter olabilir.',
            'status.in' => 'Geçerli bir durum seçiniz.',
            'assigned_to.exists' => 'Seçilen kullanıcı bulunamadı.',
        ];
    }
}
