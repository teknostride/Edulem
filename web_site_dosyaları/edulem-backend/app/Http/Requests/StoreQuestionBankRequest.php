<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionBankRequest extends FormRequest
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
            'question_text' => ['required', 'string'],
            'question_image_url' => ['nullable', 'string', 'max:500'],
            'question_type' => ['required', 'in:multiple_choice,true_false,fill_in_blank,short_answer,essay,matching,ordering'],
            'options' => ['nullable', 'array'],
            'options.*' => ['string'],
            'correct_answer' => ['required', 'string'],
            'correct_answers' => ['nullable', 'array'],
            'explanation' => ['nullable', 'string'],
            'question_bank_topic_id' => ['nullable', 'exists:question_bank_topics,id'],
            'lesson_id' => ['nullable', 'exists:lessons,id'],
            'difficulty_level' => ['required', 'in:easy,medium,hard,very_hard'],
            'estimated_time_minutes' => ['nullable', 'integer', 'min:1'],
            'points' => ['nullable', 'integer', 'min:1'],
            'school_type' => ['nullable', 'in:primary,middle,high,university,other'],
            'grade_level' => ['nullable', 'integer', 'min:1', 'max:12'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'related_question_ids' => ['nullable', 'array'],
            'related_question_ids.*' => ['exists:question_banks,id'],
            'is_active' => ['boolean'],
            'is_public' => ['boolean'],
        ];
    }
}
