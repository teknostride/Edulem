<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCalendarEventRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_type' => ['required', 'in:general,academic,meeting,appointment,assignment,exam,holiday,other'],
            'event_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'location' => ['nullable', 'string', 'max:255'],
            'target_audience' => ['required', 'array'],
            'target_audience.*.type' => ['required', 'in:all,teachers,students,staff,guardians,specific'],
            'target_audience.*.ids' => ['nullable', 'array'],
            'is_all_day' => ['boolean'],
            'is_public' => ['boolean'],
            'related_data' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'reminders' => ['nullable', 'array'],
            'reminders.*.type' => ['required', 'in:email,sms,push,in_app'],
            'reminders.*.minutes_before' => ['required', 'integer', 'min:0'],
        ];
    }
}
