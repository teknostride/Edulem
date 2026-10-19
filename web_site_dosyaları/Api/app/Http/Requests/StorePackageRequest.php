<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackageRequest extends FormRequest
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
            'slug' => ['required', 'string', 'max:255', 'unique:packages,slug'],
            'description' => ['nullable', 'string', 'max:5000'],
            'base_price' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'price_per_student' => ['required', 'numeric', 'min:0', 'max:9999999.99'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'max_users' => ['nullable', 'integer', 'min:1'],
            'max_storage_gb' => ['nullable', 'integer', 'min:1'],
            'modules' => ['nullable', 'array'],
            'modules.*' => ['string', 'max:255'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
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
            'name.required' => 'Paket adı zorunludur.',
            'name.max' => 'Paket adı en fazla 255 karakter olabilir.',
            'slug.required' => 'Slug zorunludur.',
            'slug.unique' => 'Bu slug zaten kullanılmış.',
            'slug.max' => 'Slug en fazla 255 karakter olabilir.',
            'description.max' => 'Açıklama en fazla 5000 karakter olabilir.',
            'base_price.required' => 'Base fiyat zorunludur.',
            'base_price.numeric' => 'Base fiyat sayısal bir değer olmalıdır.',
            'base_price.min' => 'Base fiyat 0\'dan küçük olamaz.',
            'price_per_student.required' => 'Öğrenci başına fiyat zorunludur.',
            'price_per_student.numeric' => 'Öğrenci başına fiyat sayısal bir değer olmalıdır.',
            'price_per_student.min' => 'Öğrenci başına fiyat 0\'dan küçük olamaz.',
            'max_students.integer' => 'Maksimum öğrenci sayısı tam sayı olmalıdır.',
            'max_students.min' => 'Maksimum öğrenci sayısı en az 1 olmalıdır.',
            'max_users.integer' => 'Maksimum kullanıcı sayısı tam sayı olmalıdır.',
            'max_users.min' => 'Maksimum kullanıcı sayısı en az 1 olmalıdır.',
            'max_storage_gb.integer' => 'Maksimum depolama tam sayı olmalıdır.',
            'max_storage_gb.min' => 'Maksimum depolama en az 1 GB olmalıdır.',
            'modules.array' => 'Modüller bir dizi olmalıdır.',
            'features.array' => 'Özellikler bir dizi olmalıdır.',
        ];
    }
}
