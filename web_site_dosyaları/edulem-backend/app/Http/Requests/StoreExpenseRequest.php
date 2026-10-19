<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
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
            'expense_category' => ['required', 'string', Rule::in(['personnel', 'rent', 'utilities', 'supplies', 'maintenance', 'marketing', 'insurance', 'tax', 'other'])],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'expense_date' => ['required', 'date', 'before_or_equal:today'],
            'description' => ['required', 'string', 'max:1000'],
            'payment_method' => ['required', 'string', Rule::in(['cash', 'credit_card', 'bank_transfer', 'check'])],
            'receipt_no' => ['nullable', 'string', 'max:255', 'unique:expenses,receipt_no'],
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
            'expense_category.required' => 'Gider kategorisi zorunludur.',
            'expense_category.in' => 'Geçerli bir gider kategorisi seçiniz.',
            'amount.required' => 'Tutar zorunludur.',
            'amount.numeric' => 'Tutar sayısal bir değer olmalıdır.',
            'amount.min' => 'Tutar en az 0.01 olmalıdır.',
            'amount.max' => 'Tutar en fazla 999999.99 olabilir.',
            'expense_date.required' => 'Gider tarihi zorunludur.',
            'expense_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'expense_date.before_or_equal' => 'Gider tarihi bugünden ileri bir tarih olamaz.',
            'description.required' => 'Açıklama zorunludur.',
            'payment_method.required' => 'Ödeme yöntemi zorunludur.',
            'payment_method.in' => 'Geçerli bir ödeme yöntemi seçiniz.',
            'receipt_no.unique' => 'Bu fiş numarası zaten kullanılmış.',
        ];
    }
}
