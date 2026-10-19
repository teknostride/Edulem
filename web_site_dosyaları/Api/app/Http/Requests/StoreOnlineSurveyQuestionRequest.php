<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOnlineSurveyQuestionRequest extends FormRequest
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
        $rules = [
            'online_survey_id' => ['required', 'exists:online_surveys,id'],
            'question' => ['required', 'string'],
            'question_type' => ['required', 'in:multiple_choice,single_choice,text,rating,scale,boolean'],
            'options' => ['nullable', 'array'],
            'is_required' => ['boolean'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];

        if ($this->isMethod('put') || $this->isMethod('patch')) {
            $rules['online_survey_id'] = ['sometimes', 'exists:online_surveys,id'];
            $rules['question'] = ['sometimes', 'string'];
            $rules['question_type'] = ['sometimes', 'in:multiple_choice,single_choice,text,rating,scale,boolean'];
        }

        return $rules;
    }
}
