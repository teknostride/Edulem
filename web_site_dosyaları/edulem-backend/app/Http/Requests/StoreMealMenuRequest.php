<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMealMenuRequest extends FormRequest
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
            'menu_date' => ['nullable', 'required_without:start_date', 'date'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'overwrite' => ['nullable', 'boolean'],
            'meal_type' => ['required', 'in:breakfast,lunch,snack,dinner'],
            'meals' => ['required', 'array', 'min:1'],
            'meals.*.name' => ['required', 'string', 'max:255'],
            'meals.*.description' => ['nullable', 'string'],
            'target_student_ids' => ['nullable', 'array'],
            'target_student_ids.*' => ['exists:students,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'notes' => ['nullable', 'string'],
            'is_published' => ['boolean'],
        ];
    }
}
