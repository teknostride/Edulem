<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAcademicYearRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('academic_years', 'code')->where('tenant_id', auth()->user()->tenant_id)
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
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
            'name.required' => 'Öğretim yılı adı zorunludur.',
            'code.required' => 'Öğretim yılı kodu zorunludur.',
            'code.unique' => 'Bu öğretim yılı kodu zaten kullanılmış.',
            'start_date.required' => 'Başlangıç tarihi zorunludur.',
            'start_date.date' => 'Geçerli bir başlangıç tarihi giriniz.',
            'end_date.required' => 'Bitiş tarihi zorunludur.',
            'end_date.date' => 'Geçerli bir bitiş tarihi giriniz.',
            'end_date.after' => 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.',
        ];
    }
}
