<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInternalMessageRequest extends FormRequest
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
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
            'type' => ['sometimes', 'string', Rule::in(['message', 'announcement'])],
            'priority' => ['sometimes', 'string', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'recipient_ids' => ['required', 'array'],
            'recipient_ids.*' => ['integer', 'exists:users,id'],
            'recipient_type' => ['sometimes', 'string', Rule::in(['user', 'role', 'classroom', 'all'])],
            'file_id' => ['nullable', 'exists:files,id'],
            'send_sms' => ['sometimes', 'boolean'],
            'send_email' => ['sometimes', 'boolean'],
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
            'message.max' => 'Mesaj en fazla 10000 karakter olabilir.',
            'recipient_ids.required' => 'Alıcı seçimi zorunludur.',
            'recipient_ids.array' => 'Alıcılar array formatında olmalıdır.',
            'recipient_ids.*.exists' => 'Seçilen alıcılardan biri bulunamadı.',
            'file_id.exists' => 'Seçilen dosya bulunamadı.',
        ];
    }
}
