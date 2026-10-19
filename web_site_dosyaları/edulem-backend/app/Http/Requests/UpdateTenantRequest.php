<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTenantRequest extends FormRequest
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
        $tenantId = $this->route('id');
        $tenant = \App\Models\Tenant::find($tenantId);
        $adminUserId = $tenant ? $tenant->users()->whereHas('role', function($q) {
            $q->where('name', 'general_manager');
        })->first()?->id : null;

        return [
            'domain' => ['sometimes', 'required', 'string', Rule::unique('tenants', 'domain')->ignore($tenantId), 'max:255', 'regex:/^[a-z0-9-]+$/'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            // Admin user fields (optional for update)
            'admin_name' => ['sometimes', 'string', 'max:255'],
            'admin_email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($adminUserId), 'max:255'],
            'admin_password' => ['sometimes', 'nullable', 'string', 'min:6', 'confirmed'],
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
        ];
    }
}
