<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScheduleRequest extends FormRequest
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
            'classroom_id' => ['required', 'exists:classrooms,id'],
            'lesson_id' => ['required', 'exists:lessons,id'],
            'teacher_id' => ['nullable', 'exists:users,id'],
            'assistant_teacher_ids' => ['nullable', 'array'],
            'assistant_teacher_ids.*' => ['exists:users,id'],
            'day_of_week' => ['required', 'string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string', 'max:255'],
            'remote_link' => ['nullable', 'url', 'max:500'],
            'program_type' => ['nullable', 'string', Rule::in(['single', 'double'])],
            'program_id' => ['nullable', 'integer'],
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
            'classroom_id.required' => 'Sınıf seçimi zorunludur.',
            'classroom_id.exists' => 'Seçilen sınıf bulunamadı.',
            'lesson_id.required' => 'Ders seçimi zorunludur.',
            'lesson_id.exists' => 'Seçilen ders bulunamadı.',
            'teacher_id.exists' => 'Seçilen öğretmen bulunamadı.',
            'day_of_week.required' => 'Haftanın günü zorunludur.',
            'day_of_week.in' => 'Geçerli bir gün seçiniz.',
            'start_time.required' => 'Başlangıç saati zorunludur.',
            'start_time.date_format' => 'Başlangıç saati geçerli bir saat formatında olmalıdır (HH:MM).',
            'end_time.required' => 'Bitiş saati zorunludur.',
            'end_time.date_format' => 'Bitiş saati geçerli bir saat formatında olmalıdır (HH:MM).',
            'end_time.after' => 'Bitiş saati başlangıç saatinden sonra olmalıdır.',
            'room.max' => 'Derslik adı en fazla 255 karakter olabilir.',
            'notes.max' => 'Notlar en fazla 1000 karakter olabilir.',
        ];
    }
}
