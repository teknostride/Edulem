<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCurriculumTrackingRequest extends FormRequest
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
            'lesson_id' => ['required', 'exists:lessons,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'teacher_id' => ['required', 'exists:users,id'],
            'teaching_date' => ['required', 'date'],
            'topic' => ['required', 'string', 'max:255'],
            'topic_description' => ['nullable', 'string'],
            'lesson_hour' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string'],
            'materials' => ['nullable', 'array'],
            'materials.*' => ['string'],
            'activities' => ['nullable', 'array'],
            'activities.*' => ['string'],
            'is_completed' => ['boolean'],
        ];
    }
}
