<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGuidanceNoteRequest extends FormRequest
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
            'counselor_id' => ['required', 'exists:users,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'type' => ['nullable', 'in:meeting,observation,consultation,follow_up,other'],
            'note_date' => ['required', 'date'],
            'note_time' => ['nullable', 'date_format:H:i'],
            'is_visible_to_guardian' => ['boolean'],
            'is_confidential' => ['boolean'],
            'requires_admin_review' => ['boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['exists:files,id'],
            'follow_up_notes' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
        ];
    }
}
