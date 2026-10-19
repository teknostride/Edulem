<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExamScoreCoefficientRequest extends FormRequest
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
            'exam_id' => ['required', 'exists:exams,id'],
            'coefficient_type' => ['required', 'string', Rule::in(['TYT', 'AYT', 'LGS', 'KPSS', 'custom'])],
            'coefficient_name' => ['required_if:coefficient_type,custom', 'nullable', 'string', 'max:255'],
            'coefficients' => ['required', 'array'],
            'coefficients.*' => ['numeric', 'min:0', 'max:10'],
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
            'exam_id.required' => 'Sınav seçimi zorunludur.',
            'exam_id.exists' => 'Seçilen sınav bulunamadı.',
            'coefficient_type.required' => 'Katsayı türü zorunludur.',
            'coefficient_type.in' => 'Geçerli bir katsayı türü seçiniz.',
            'coefficient_name.required_if' => 'Özel katsayı için isim zorunludur.',
            'coefficients.required' => 'Katsayılar zorunludur.',
            'coefficients.array' => 'Katsayılar array formatında olmalıdır.',
            'coefficients.*.numeric' => 'Katsayılar sayısal değerler olmalıdır.',
            'coefficients.*.min' => 'Katsayılar 0\'dan küçük olamaz.',
            'coefficients.*.max' => 'Katsayılar 10\'dan büyük olamaz.',
        ];
    }
}
