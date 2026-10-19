<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSmsTemplateRequest extends FormRequest
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
        $templateId = $this->route('smsTemplate')->id ?? null;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['sometimes', 'string', 'max:100', Rule::unique('sms_templates', 'code')->ignore($templateId)],
            'content' => ['sometimes', 'string', 'max:1000'],
            'variables' => ['nullable', 'array'],
            'variables.*' => ['string'],
            'type' => ['sometimes', 'string', Rule::in(['system', 'custom', 'general', 'attendance', 'exam', 'payment'])],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:500'],
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
            'name.max' => 'Şablon adı en fazla 255 karakter olabilir.',
            'code.unique' => 'Bu şablon kodu zaten kullanılıyor.',
            'code.max' => 'Şablon kodu en fazla 100 karakter olabilir.',
            'content.max' => 'Şablon içeriği en fazla 1000 karakter olabilir.',
            'description.max' => 'Açıklama en fazla 500 karakter olabilir.',
        ];
    }
}
