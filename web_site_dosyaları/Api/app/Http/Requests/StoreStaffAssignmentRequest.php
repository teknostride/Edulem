<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffAssignmentRequest extends FormRequest
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
            'assignment_type' => ['required', 'in:exam_topic_analysis,answer_key_preparation,online_exam_question_selection,booklet_question_selection,text_correction,other'],
            'assigned_staff_ids' => ['required', 'array', 'min:1'],
            'assigned_staff_ids.*' => ['exists:users,id'],
            'team_leader_id' => ['nullable', 'exists:users,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
            'completion_percentage' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', 'in:pending,in_progress,completed,cancelled'],
            'related_data' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'show_in_calendar' => ['boolean'],
        ];
    }
}
