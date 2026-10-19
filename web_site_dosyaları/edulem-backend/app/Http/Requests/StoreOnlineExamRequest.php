<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOnlineExamRequest extends FormRequest
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
            'lesson_id' => ['nullable', 'exists:lessons,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['integer'],
            'question_count' => ['required', 'integer', 'min:1'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'total_points' => ['required', 'numeric', 'min:0'],
            'scoring_formula' => ['nullable', 'string', 'max:255'],
            'points_per_question' => ['nullable', 'numeric', 'min:0'],
            'negative_points' => ['nullable', 'numeric', 'min:0'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'single_attempt' => ['boolean'],
            'allow_retake' => ['boolean'],
            'max_attempts' => ['integer', 'min:1'],
            'auto_submit' => ['boolean'],
            'show_results_immediately' => ['boolean'],
            'show_correct_answers' => ['boolean'],
            'shuffle_questions' => ['boolean'],
            'shuffle_options' => ['boolean'],
            'status' => ['nullable', 'in:draft,published,active,completed,cancelled'],
        ];
    }
}
