<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDutyScheduleRequest extends FormRequest
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
            'user_id' => ['sometimes', 'exists:users,id'],
            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'education_level_id' => ['nullable', 'integer', 'exists:education_levels,id'],
            'day_of_week' => ['sometimes', Rule::in([
                1, 2, 3, 4, 5, 6, 7,
                '1', '2', '3', '4', '5', '6', '7',
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
            ])],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
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
            'user_id.exists' => 'Seçilen personel bulunamadı.',
            'day_of_week.in' => 'Geçerli bir gün seçiniz.',
            'start_time.date_format' => 'Başlangıç saati geçerli bir saat formatında olmalıdır (HH:MM).',
            'end_time.date_format' => 'Bitiş saati geçerli bir saat formatında olmalıdır (HH:MM).',
            'end_time.after' => 'Bitiş saati başlangıç saatinden sonra olmalıdır.',
            'location.max' => 'Nöbet yeri en fazla 255 karakter olabilir.',
            'notes.max' => 'Notlar en fazla 1000 karakter olabilir.',
        ];
    }
}
