<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuestionDailyLimitRequest extends FormRequest
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
            'user_type' => ['required', 'string', Rule::in(['student', 'guardian'])],
            'daily_limit' => ['required', 'integer', 'min:1', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
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
            'user_type.required' => 'Kullanıcı türü zorunludur.',
            'user_type.in' => 'Geçerli bir kullanıcı türü seçiniz (student, guardian).',
            'daily_limit.required' => 'Günlük limit zorunludur.',
            'daily_limit.integer' => 'Günlük limit bir sayı olmalıdır.',
            'daily_limit.min' => 'Günlük limit en az 1 olmalıdır.',
            'daily_limit.max' => 'Günlük limit en fazla 100 olabilir.',
        ];
    }
}
