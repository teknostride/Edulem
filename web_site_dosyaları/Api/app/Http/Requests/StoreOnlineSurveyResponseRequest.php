<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOnlineSurveyResponseRequest extends FormRequest
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
            'online_survey_id' => ['required', 'exists:online_surveys,id'],
            'respondent_type' => ['nullable', 'in:teacher,student,staff,guardian'],
            'respondent_education_level_id' => ['nullable', 'integer', 'exists:education_levels,id'],
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'exists:online_survey_questions,id'],
            'answers.*.answer' => ['nullable'],
            'answers.*.selected_options' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'is_anonymous' => ['boolean'],
        ];
    }
}
