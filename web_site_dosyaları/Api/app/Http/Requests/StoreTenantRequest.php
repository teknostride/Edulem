<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTenantRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'domain' => ['required', 'string', 'unique:tenants,domain', 'max:255', 'regex:/^[a-z0-9-]+$/'],
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            // Admin user fields
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'unique:users,email', 'max:255'],
            'admin_password' => ['sometimes', 'nullable', 'string', 'min:6', 'confirmed'], // Boş bırakılabilir (backend'de 123456 olacak)
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
            'domain.required' => 'Domain zorunludur.',
            'domain.unique' => 'Bu domain zaten kullanılmış.',
            'domain.max' => 'Domain en fazla 255 karakter olabilir.',
            'domain.regex' => 'Domain sadece küçük harf, rakam ve tire içerebilir.',
            'name.required' => 'Kurum adı zorunludur.',
            'name.max' => 'Kurum adı en fazla 255 karakter olabilir.',
            'admin_name.required' => 'Yönetici adı zorunludur.',
            'admin_email.required' => 'Yönetici e-posta zorunludur.',
            'admin_email.email' => 'Geçerli bir e-posta adresi giriniz.',
            'admin_email.unique' => 'Bu e-posta adresi zaten kullanılmış.',
            'admin_password.required' => 'Şifre zorunludur.',
            'admin_password.min' => 'Şifre en az 6 karakter olmalıdır.',
            'admin_password.confirmed' => 'Şifreler eşleşmiyor.',
        ];
    }
}
