<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriptionRequest extends FormRequest
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
            'package_id' => ['sometimes', 'required', 'exists:packages,id'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['nullable', 'date'],
            'billing_cycle' => ['sometimes', 'string', Rule::in(['monthly', 'quarterly', 'yearly'])],
            'student_count' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'suspended', 'cancelled', 'expired'])],
            'trial_ends_at' => ['nullable', 'date'],
            'cancelled_at' => ['nullable', 'date'],
            'cancellation_reason' => ['nullable', 'string', 'max:5000'],
            'notes' => ['nullable', 'string', 'max:5000'],
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
            'end_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'billing_cycle.in' => 'Geçerli bir fatura döngüsü seçiniz.',
            'student_count.integer' => 'Öğrenci sayısı tam sayı olmalıdır.',
            'student_count.min' => 'Öğrenci sayısı 0\'dan küçük olamaz.',
            'status.in' => 'Geçerli bir durum seçiniz.',
            'trial_ends_at.date' => 'Geçerli bir tarih formatı giriniz.',
            'cancelled_at.date' => 'Geçerli bir tarih formatı giriniz.',
            'cancellation_reason.max' => 'İptal nedeni en fazla 5000 karakter olabilir.',
            'notes.max' => 'Notlar en fazla 5000 karakter olabilir.',
        ];
    }
}
