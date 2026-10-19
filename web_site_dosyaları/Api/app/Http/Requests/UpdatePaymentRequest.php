<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentRequest extends FormRequest
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
        $paymentId = $this->route('id');

        return [
            'student_id' => ['sometimes', 'required', 'exists:students,id'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0.01', 'max:999999.99'],
            'payment_date' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'payment_method' => ['sometimes', 'required', 'string', Rule::in(['cash', 'credit_card', 'bank_transfer', 'online'])],
            'receipt_no' => ['nullable', 'string', 'max:255', Rule::unique('payments', 'receipt_no')->ignore($paymentId)],
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
            'amount.required' => 'Tutar zorunludur.',
            'amount.numeric' => 'Tutar sayısal bir değer olmalıdır.',
            'amount.min' => 'Tutar en az 0.01 olmalıdır.',
            'amount.max' => 'Tutar en fazla 999999.99 olabilir.',
            'payment_date.required' => 'Ödeme tarihi zorunludur.',
            'payment_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'payment_date.before_or_equal' => 'Ödeme tarihi bugünden ileri bir tarih olamaz.',
            'payment_method.required' => 'Ödeme yöntemi zorunludur.',
            'payment_method.in' => 'Geçerli bir ödeme yöntemi seçiniz.',
            'receipt_no.unique' => 'Bu makbuz numarası zaten kullanılmış.',
        ];
    }
}
