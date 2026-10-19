<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTutoringSessionRequest extends FormRequest
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
            'teacher_id' => ['required', 'exists:users,id'],
            'lesson_id' => ['nullable', 'exists:lessons,id'],
            'type' => ['required', Rule::in(['tutoring', 'extra_lesson', 'private_lesson', 'class_tutoring', 'seminar'])],
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'duration' => ['required', 'integer', 'min:20', 'max:240'],
            'room' => ['nullable', 'string', 'max:255'],
            'remote_link' => ['nullable', 'url', 'max:500'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'weekly_max_count' => ['nullable', 'integer', 'min:1'],
            'homework_id' => ['nullable', 'exists:homeworks,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['exists:students,id'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'teacher_id.required' => 'Öğretmen seçimi zorunludur.',
            'teacher_id.exists' => 'Seçilen öğretmen bulunamadı.',
            'type.required' => 'Etüt türü seçimi zorunludur.',
            'type.in' => 'Geçersiz etüt türü.',
            'title.required' => 'Etüt başlığı zorunludur.',
            'date.required' => 'Etüt tarihi zorunludur.',
            'date.after_or_equal' => 'Etüt tarihi bugünden önce olamaz.',
            'start_time.required' => 'Başlangıç saati zorunludur.',
            'end_time.required' => 'Bitiş saati zorunludur.',
            'end_time.after' => 'Bitiş saati başlangıç saatinden sonra olmalıdır.',
            'duration.required' => 'Etüt süresi zorunludur.',
            'duration.min' => 'Etüt süresi en az 20 dakika olmalıdır.',
            'duration.max' => 'Etüt süresi en fazla 240 dakika olabilir.',
            'remote_link.url' => 'Uzaktan eğitim bağlantısı geçerli bir URL olmalıdır.',
        ];
    }
}
