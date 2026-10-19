<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMealAttendanceRequest extends FormRequest
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
            'meal_menu_id' => ['required', 'exists:meal_menus,id'],
            'student_id' => ['required', 'exists:students,id'],
            'attendance_date' => ['required', 'date'],
            'meal_type' => ['required', 'in:breakfast,lunch,snack,dinner'],
            'status' => ['required', 'in:present,absent,excused'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
