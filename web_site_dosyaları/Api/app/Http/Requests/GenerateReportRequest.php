<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateReportRequest extends FormRequest
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
            'report_type' => ['required', 'string', Rule::in([
                'students', 'financial', 'attendance',
                'cash_report', 'overdue_percentage', 'collection_total', 'future_payments', 'monthly_expenses',
                'classroom_occupancy', 'student_count_by_gender', 'exam_participation_monthly',
                'lead_statistics',
            ])],
            'format' => ['required', 'string', Rule::in(['excel', 'pdf'])],
            'send_email' => ['sometimes', 'boolean'],
            'recipient_email' => ['required_if:send_email,true', 'nullable', 'email', 'max:255'],
            'parameters' => ['sometimes', 'array'],
            'parameters.city_id' => ['sometimes', 'nullable', 'exists:cities,id'],
            'parameters.district_id' => ['sometimes', 'nullable', 'exists:districts,id'],
            'parameters.start_date' => ['sometimes', 'nullable', 'date'],
            'parameters.end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:parameters.start_date'],
            'parameters.year' => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:2100'],
            'parameters.month' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:12'],
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
            'report_type.required' => 'Rapor tipi gereklidir.',
            'report_type.in' => 'Geçersiz rapor tipi.',
            'format.required' => 'Format gereklidir.',
            'format.in' => 'Format excel veya pdf olmalıdır.',
            'recipient_email.required_if' => 'E-posta gönderimi için alıcı e-posta adresi gereklidir.',
            'recipient_email.email' => 'Geçerli bir e-posta adresi giriniz.',
            'parameters.end_date.after_or_equal' => 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
        ];
    }
}
