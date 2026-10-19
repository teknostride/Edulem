<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
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
            // Tenant fields
            'domain' => ['required', 'string', 'max:255', 'unique:tenants,domain', 'regex:/^[a-zA-Z0-9-]+$/'],
            'subdomain' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
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
            'is_active' => ['boolean'],
            'subscription_expires_at' => ['nullable', 'date'],

            // Admin user fields
            'admin_tc_no' => ['required', 'string', 'size:11', 'unique:users,tc_no'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['nullable', 'email', 'max:255'],
            'admin_phone' => ['nullable', 'string', 'max:50'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
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
            // Tenant messages
            'domain.required' => 'Domain alanı zorunludur.',
            'domain.unique' => 'Bu domain zaten kullanımda.',
            'domain.regex' => 'Domain sadece harf, rakam ve tire içerebilir.',
            'name.required' => 'Kurum adı zorunludur.',
            'subscription_expires_at.after' => 'Abonelik bitiş tarihi bugünden sonra olmalıdır.',

            // Admin user messages
            'admin_tc_no.required' => 'Yönetici T.C. Kimlik Numarası zorunludur.',
            'admin_tc_no.size' => 'T.C. Kimlik Numarası 11 haneli olmalıdır.',
            'admin_tc_no.unique' => 'Bu T.C. Kimlik Numarası ile kayıtlı bir kullanıcı zaten mevcut.',
            'admin_name.required' => 'Yönetici adı zorunludur.',
            'admin_email.email' => 'Geçerli bir email adresi giriniz.',
            'admin_password.required' => 'Yönetici şifresi zorunludur.',
            'admin_password.min' => 'Şifre en az 8 karakter olmalıdır.',
            'admin_password.confirmed' => 'Şifre tekrarı eşleşmiyor.',
        ];
    }
}
