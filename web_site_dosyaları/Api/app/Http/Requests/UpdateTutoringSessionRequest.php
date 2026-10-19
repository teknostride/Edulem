<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTutoringSessionRequest extends FormRequest
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
            'teacher_id' => ['sometimes', 'exists:users,id'],
            'lesson_id' => ['nullable', 'exists:lessons,id'],
            'type' => ['sometimes', Rule::in(['tutoring', 'extra_lesson', 'private_lesson', 'class_tutoring', 'seminar'])],
            'title' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'duration' => ['sometimes', 'integer', 'min:20', 'max:240'],
            'room' => ['nullable', 'string', 'max:255'],
            'remote_link' => ['nullable', 'url', 'max:500'],
            'max_students' => ['nullable', 'integer', 'min:1'],
            'weekly_max_count' => ['nullable', 'integer', 'min:1'],
            'homework_id' => ['nullable', 'exists:homeworks,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['exists:students,id'],
        ];
    }
}
