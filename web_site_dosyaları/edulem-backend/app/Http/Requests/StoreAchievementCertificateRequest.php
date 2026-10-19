<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAchievementCertificateRequest extends FormRequest
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
            'certificate_type' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'achievement_date' => ['required', 'date'],
            'photo_ids' => ['nullable', 'array'],
            'photo_ids.*' => ['exists:files,id'],
            'file_id' => ['nullable', 'exists:files,id'],
            'is_published_to_guardian' => ['boolean'],
            'is_added_to_portfolio' => ['boolean'],
        ];
    }
}
