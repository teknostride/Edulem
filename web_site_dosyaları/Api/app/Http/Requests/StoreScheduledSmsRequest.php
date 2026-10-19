<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScheduledSmsRequest extends FormRequest
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
            'title' => ['nullable', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:1000'],
            'recipient_type' => ['required', 'string', Rule::in(['phones', 'students', 'guardians', 'users', 'classroom', 'all'])],
            'target_audience' => ['nullable', 'string', Rule::in(['all', 'mother', 'father', 'guardians', 'student'])],
            'recipient_phones' => ['required_if:recipient_type,phones', 'nullable', 'array'],
            'recipient_phones.*' => ['string', 'regex:/^\+?[0-9]{10,15}$/'],
            'recipient_ids' => ['required_if:recipient_type,students', 'required_if:recipient_type,guardians', 'required_if:recipient_type,users', 'required_if:recipient_type,classroom', 'array'],
            'recipient_ids.*' => ['integer'],
            'scheduled_at' => ['nullable', 'date'],
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
            'message.required' => 'Mesaj zorunludur.',
            'message.max' => 'Mesaj en fazla 1000 karakter olabilir.',
            'recipient_type.required' => 'Alıcı tipi zorunludur.',
            'recipient_type.in' => 'Geçerli bir alıcı tipi seçiniz.',
            'recipient_phones.required_if' => 'Telefon numaraları zorunludur.',
            'recipient_phones.*.regex' => 'Geçerli bir telefon numarası formatı giriniz (10-15 haneli, örn: 905XXXXXXXXX veya 05XXXXXXXXX).',
            'recipient_ids.required_if' => 'Alıcı ID\'leri zorunludur.',
            'scheduled_at.date' => 'Geçerli bir planlanan tarih giriniz.',
        ];
    }
}
