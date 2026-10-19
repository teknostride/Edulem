<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCalendarEventParticipantRequest extends FormRequest
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
            'calendar_event_id' => ['required', 'exists:calendar_events,id'],
            'user_id' => ['nullable', 'required_without_all:student_id,guardian_id', 'exists:users,id'],
            'student_id' => ['nullable', 'required_without_all:user_id,guardian_id', 'exists:students,id'],
            'guardian_id' => ['nullable', 'required_without_all:user_id,student_id', 'exists:guardians,id'],
            'participant_type' => ['required', 'in:user,student,guardian'],
            'status' => ['nullable', 'in:pending,accepted,declined,tentative'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
