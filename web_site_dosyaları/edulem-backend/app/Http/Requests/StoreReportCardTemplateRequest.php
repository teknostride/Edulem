<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreReportCardTemplateRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in(['primary', 'secondary', 'high_school', 'custom'])],
            'description' => ['nullable', 'string', 'max:1000'],
            'template_config' => ['required', 'array'],
            'pdf_template_file_id' => ['nullable', 'exists:files,id'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
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
            'name.required' => 'Şablon adı zorunludur.',
            'name.max' => 'Şablon adı en fazla 255 karakter olabilir.',
            'type.required' => 'Şablon türü zorunludur.',
            'type.in' => 'Geçerli bir şablon türü seçiniz.',
            'description.max' => 'Açıklama en fazla 1000 karakter olabilir.',
            'template_config.required' => 'Şablon yapılandırması zorunludur.',
            'template_config.array' => 'Şablon yapılandırması array formatında olmalıdır.',
            'pdf_template_file_id.exists' => 'Seçilen PDF şablon dosyası bulunamadı.',
        ];
    }
}
