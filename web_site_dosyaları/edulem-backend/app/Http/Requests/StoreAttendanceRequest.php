<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAttendanceRequest extends FormRequest
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
            'student_id' => ['required', 'exists:students,id'],
            'schedule_id' => ['nullable', 'exists:schedules,id'],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'status' => ['required', 'string', Rule::in(['present', 'absent', 'late', 'excused', 'sick'])],
            'is_administrative_leave' => ['sometimes', 'boolean'],
            'administrative_leave_reason' => ['required_if:is_administrative_leave,true', 'nullable', 'string', 'max:1000'],
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
            'schedule_id.exists' => 'Seçilen ders programı bulunamadı.',
            'date.required' => 'Tarih zorunludur.',
            'date.date' => 'Geçerli bir tarih formatı giriniz.',
            'date.before_or_equal' => 'Tarih bugünden ileri bir tarih olamaz.',
            'status.required' => 'Yoklama durumu zorunludur.',
            'status.in' => 'Geçerli bir yoklama durumu seçiniz.',
            'notes.max' => 'Notlar en fazla 1000 karakter olabilir.',
        ];
    }
}
