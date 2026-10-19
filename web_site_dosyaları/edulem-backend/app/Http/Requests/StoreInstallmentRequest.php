<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInstallmentRequest extends FormRequest
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
            'student_id' => ['required', 'exists:students,id'],
            'total_amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'installment_count' => ['required', 'integer', 'min:2', 'max:24'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
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
            'total_amount.required' => 'Toplam tutar zorunludur.',
            'total_amount.numeric' => 'Toplam tutar sayısal bir değer olmalıdır.',
            'total_amount.min' => 'Toplam tutar en az 0.01 olmalıdır.',
            'total_amount.max' => 'Toplam tutar en fazla 999999.99 olabilir.',
            'installment_count.required' => 'Taksit sayısı zorunludur.',
            'installment_count.integer' => 'Taksit sayısı tam sayı olmalıdır.',
            'installment_count.min' => 'Taksit sayısı en az 2 olmalıdır.',
            'installment_count.max' => 'Taksit sayısı en fazla 24 olabilir.',
            'start_date.required' => 'Başlangıç tarihi zorunludur.',
            'start_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'start_date.after_or_equal' => 'Başlangıç tarihi bugünden önce olamaz.',
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Taksit tutarını hesapla ve kontrol et
            if ($this->has('total_amount') && $this->has('installment_count')) {
                $installmentAmount = $this->input('total_amount') / $this->input('installment_count');
                
                if ($installmentAmount < 0.01) {
                    $validator->errors()->add('installment_count', 'Taksit sayısı çok fazla. Her taksit en az 0.01 TL olmalıdır.');
                }
            }
        });
    }
}
