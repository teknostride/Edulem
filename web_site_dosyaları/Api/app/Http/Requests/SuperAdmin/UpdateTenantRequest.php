<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantRequest extends FormRequest
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
        $tenantId = $this->route('tenant');

        return [
            'domain' => ['sometimes', 'string', 'max:255', 'unique:tenants,domain,' . $tenantId, 'regex:/^[a-zA-Z0-9-]+$/'],
            'subdomain' => ['nullable', 'string', 'max:255'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'authorized_person' => ['nullable', 'string', 'max:255'],
            'authorized_phone' => ['nullable', 'string', 'max:50'],
            'authorized_email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'tax_office' => ['nullable', 'string', 'max:150'],
            'tax_number' => ['nullable', 'string', 'max:50'],
            'contract_start_date' => ['nullable', 'date'],
            'contract_end_date' => ['nullable', 'date'],
            'contract_amount' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'subscription_expires_at' => ['nullable', 'date'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'domain.unique' => 'Bu domain zaten kullanımda.',
            'domain.regex' => 'Domain sadece harf, rakam ve tire içerebilir.',
            'subscription_expires_at.date' => 'Geçerli bir tarih formatı giriniz.',
        ];
    }
}
