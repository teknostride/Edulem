<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFormSurveyResponseRequest extends FormRequest
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
            'form_survey_id' => ['required', 'exists:form_surveys,id'],
            'respondent_type' => ['nullable', 'in:teacher,student,staff,guardian'],
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.answer' => ['nullable', 'string'],
            'answers.*.selected_options' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'is_anonymous' => ['boolean'],
        ];
    }
}
