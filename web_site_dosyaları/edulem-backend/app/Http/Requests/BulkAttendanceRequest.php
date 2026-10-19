<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkAttendanceRequest extends FormRequest
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
            'schedule_id' => ['nullable', 'exists:schedules,id'],
            'date' => ['required', 'date'],
            'attendances' => ['required', 'array', 'min:1'],
            'attendances.*.student_id' => ['required', 'exists:students,id'],
            'attendances.*.status' => ['required', 'string', Rule::in(['present', 'absent', 'late', 'excused', 'sick'])],
            'attendances.*.notes' => ['nullable', 'string', 'max:1000'],
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
            'schedule_id.exists' => 'Seçilen ders programı bulunamadı.',
            'date.required' => 'Tarih zorunludur.',
            'date.date' => 'Geçerli bir tarih formatı giriniz.',
            'attendances.required' => 'Yoklama listesi zorunludur.',
            'attendances.array' => 'Yoklama listesi bir dizi olmalıdır.',
            'attendances.min' => 'En az bir öğrenci için yoklama kaydı gerekir.',
            'attendances.*.student_id.required' => 'Öğrenci seçimi zorunludur.',
            'attendances.*.student_id.exists' => 'Seçilen öğrenci bulunamadı.',
            'attendances.*.status.required' => 'Yoklama durumu zorunludur.',
            'attendances.*.status.in' => 'Geçerli bir yoklama durumu seçiniz.',
            'attendances.*.notes.max' => 'Notlar en fazla 1000 karakter olabilir.',
        ];
    }
}
