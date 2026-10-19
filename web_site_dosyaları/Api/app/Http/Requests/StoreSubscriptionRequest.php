<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubscriptionRequest extends FormRequest
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
            'package_id' => ['required', 'exists:packages,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'billing_cycle' => ['sometimes', 'string', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'student_count' => ['sometimes', 'integer', 'min:0'],
            'trial_ends_at' => ['nullable', 'date', 'after:start_date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'modules' => ['nullable', 'array'],
            'modules.*.module' => ['required', 'string', 'max:255'],
            'modules.*.is_active' => ['sometimes', 'boolean'],
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
            'package_id.required' => 'Paket seçimi zorunludur.',
            'package_id.exists' => 'Seçilen paket bulunamadı.',
            'start_date.required' => 'Başlangıç tarihi zorunludur.',
            'start_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'start_date.after_or_equal' => 'Başlangıç tarihi bugünden önce olamaz.',
            'end_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'end_date.after' => 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.',
            'billing_cycle.in' => 'Geçerli bir fatura döngüsü seçiniz.',
            'student_count.integer' => 'Öğrenci sayısı tam sayı olmalıdır.',
            'student_count.min' => 'Öğrenci sayısı 0\'dan küçük olamaz.',
            'trial_ends_at.date' => 'Geçerli bir tarih formatı giriniz.',
            'trial_ends_at.after' => 'Deneme bitiş tarihi başlangıç tarihinden sonra olmalıdır.',
            'notes.max' => 'Notlar en fazla 5000 karakter olabilir.',
            'modules.array' => 'Modüller bir dizi olmalıdır.',
            'modules.*.module.required' => 'Modül adı zorunludur.',
        ];
    }
}
