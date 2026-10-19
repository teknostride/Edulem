<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractRequest extends FormRequest
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
            'student_id' => ['sometimes', 'required', 'exists:students,id'],
            'contract_date' => ['sometimes', 'required', 'date'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['nullable', 'date'],
            'total_amount' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999.99'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'active', 'expired', 'cancelled'])],
            'file_id' => ['nullable', 'exists:files,id'],
            'terms' => ['nullable', 'string', 'max:10000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'signed_by_guardian' => ['nullable', 'exists:guardians,id'],
            'signed_at' => ['nullable', 'date'],
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
            'student_id.required' => 'Öğrenci seçimi zorunludur.',
            'student_id.exists' => 'Seçilen öğrenci bulunamadı.',
            'contract_date.required' => 'Sözleşme tarihi zorunludur.',
            'contract_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'start_date.required' => 'Başlangıç tarihi zorunludur.',
            'start_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'end_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'total_amount.required' => 'Toplam tutar zorunludur.',
            'total_amount.numeric' => 'Toplam tutar sayısal bir değer olmalıdır.',
            'total_amount.min' => 'Toplam tutar 0\'dan küçük olamaz.',
            'total_amount.max' => 'Toplam tutar çok büyük.',
            'status.in' => 'Geçerli bir durum seçiniz.',
            'file_id.exists' => 'Seçilen dosya bulunamadı.',
            'terms.max' => 'Şartlar en fazla 10000 karakter olabilir.',
            'notes.max' => 'Notlar en fazla 5000 karakter olabilir.',
            'signed_by_guardian.exists' => 'Seçilen veli bulunamadı.',
            'signed_at.date' => 'Geçerli bir tarih formatı giriniz.',
        ];
    }
}
