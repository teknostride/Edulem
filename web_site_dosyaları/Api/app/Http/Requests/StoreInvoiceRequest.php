<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
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
            'invoice_type' => ['required', 'string', Rule::in(['tuition', 'material', 'other'])],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'invoice_date' => ['nullable', 'date', 'before_or_equal:today'],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'description' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:255'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0.01'],
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
            'invoice_type.required' => 'Fatura tipi zorunludur.',
            'invoice_type.in' => 'Geçerli bir fatura tipi seçiniz.',
            'amount.required' => 'Tutar zorunludur.',
            'amount.numeric' => 'Tutar sayısal bir değer olmalıdır.',
            'amount.min' => 'Tutar en az 0.01 olmalıdır.',
            'amount.max' => 'Tutar en fazla 999999.99 olabilir.',
            'due_date.required' => 'Vade tarihi zorunludur.',
            'due_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'due_date.after_or_equal' => 'Vade tarihi bugünden önce olamaz.',
        ];
    }
}
