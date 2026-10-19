<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFormSurveyRequest extends FormRequest
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
            'survey_type' => ['required', 'in:teacher_satisfaction,counselor_satisfaction,principal_satisfaction,staff_satisfaction,institution_satisfaction,custom'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.question' => ['required', 'string'],
            'questions.*.type' => ['required', 'in:multiple_choice,single_choice,text,rating,scale'],
            'questions.*.options' => ['required_if:questions.*.type,multiple_choice,single_choice', 'array'],
            'questions.*.required' => ['boolean'],
            'target_audience' => ['required', 'array'],
            'target_audience.*.type' => ['required', 'in:all,teachers,students,staff,guardians'],
            'target_audience.*.ids' => ['nullable', 'array'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'is_active' => ['boolean'],
            'allow_anonymous' => ['boolean'],
            'show_results' => ['boolean'],
        ];
    }
}
