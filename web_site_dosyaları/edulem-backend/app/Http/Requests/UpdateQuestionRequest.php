<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQuestionRequest extends FormRequest
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
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'message' => ['sometimes', 'required', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'response' => ['nullable', 'string', 'max:5000'],
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
            'subject.required' => 'Konu zorunludur.',
            'subject.max' => 'Konu en fazla 255 karakter olabilir.',
            'message.required' => 'Mesaj zorunludur.',
            'message.max' => 'Mesaj en fazla 5000 karakter olabilir.',
            'status.in' => 'Geçerli bir durum seçiniz.',
            'assigned_to.exists' => 'Seçilen kullanıcı bulunamadı.',
            'response.max' => 'Yanıt en fazla 5000 karakter olabilir.',
        ];
    }
}
