<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBulletinRequest extends FormRequest
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
            'student_id' => ['required', 'exists:students,id'],
            'template_id' => ['nullable', 'exists:bulletin_templates,id'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'photo_ids' => ['nullable', 'array'],
            'photo_ids.*' => ['exists:files,id'],
            'teacher_comments' => ['nullable', 'array'],
            'teacher_comments.*.teacher_id' => ['required', 'exists:users,id'],
            'teacher_comments.*.comment' => ['required', 'string'],
            'teacher_comments.*.date' => ['required', 'date'],
            'achievements' => ['nullable', 'array'],
            'achievements.*.title' => ['required', 'string', 'max:255'],
            'achievements.*.description' => ['nullable', 'string'],
            'achievements.*.date' => ['required', 'date'],
            'bulletin_date' => ['required', 'date'],
            'is_published_to_guardian' => ['boolean'],
            'is_added_to_portfolio' => ['boolean'],
        ];
    }
}
