<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsRequest extends FormRequest
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
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'max:255'],
            'settings.*.value' => ['required'],
            'settings.*.type' => ['sometimes', 'string', Rule::in(['string', 'integer', 'boolean', 'json'])],
            'settings.*.group' => ['sometimes', 'string', 'max:255'],
            'settings.*.description' => ['nullable', 'string', 'max:1000'],
            'settings.*.is_public' => ['sometimes', 'boolean'],
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
            'settings.required' => 'Ayarlar zorunludur.',
            'settings.array' => 'Ayarlar bir dizi olmalıdır.',
            'settings.min' => 'En az bir ayar gerekir.',
            'settings.*.key.required' => 'Ayar anahtarı zorunludur.',
            'settings.*.key.max' => 'Ayar anahtarı en fazla 255 karakter olabilir.',
            'settings.*.value.required' => 'Ayar değeri zorunludur.',
            'settings.*.type.in' => 'Geçerli bir tip seçiniz.',
            'settings.*.group.max' => 'Grup adı en fazla 255 karakter olabilir.',
            'settings.*.description.max' => 'Açıklama en fazla 1000 karakter olabilir.',
        ];
    }
}
