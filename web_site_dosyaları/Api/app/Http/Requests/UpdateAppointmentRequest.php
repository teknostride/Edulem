<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentRequest extends FormRequest
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
            'lead_id' => ['nullable', 'exists:leads,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'regex:/^05[0-9]{9}$/', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'appointment_date' => ['sometimes', 'required', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', Rule::in(['scheduled', 'completed', 'cancelled', 'no_show'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
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
            'lead_id.exists' => 'Seçilen lead bulunamadı.',
            'name.required' => 'Ad soyad zorunludur.',
            'name.max' => 'Ad soyad en fazla 255 karakter olabilir.',
            'phone.required' => 'Telefon numarası zorunludur.',
            'phone.regex' => 'Telefon numarası 05XXXXXXXXX formatında olmalıdır.',
            'phone.max' => 'Telefon numarası en fazla 20 karakter olabilir.',
            'email.email' => 'Geçerli bir e-posta adresi giriniz.',
            'email.max' => 'E-posta adresi en fazla 255 karakter olabilir.',
            'appointment_date.required' => 'Randevu tarihi zorunludur.',
            'appointment_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'notes.max' => 'Notlar en fazla 5000 karakter olabilir.',
            'status.in' => 'Geçerli bir durum seçiniz.',
            'assigned_to.exists' => 'Seçilen kullanıcı bulunamadı.',
        ];
    }
}
