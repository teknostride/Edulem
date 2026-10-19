<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScholarshipExamRequest extends FormRequest
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
            'exam_date' => ['required', 'date'],
            'exam_time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'sessions' => ['nullable', 'array'],
            'sessions.*.id' => ['required', 'string'],
            'sessions.*.time' => ['required', 'date_format:H:i'],
            'sessions.*.capacity' => ['nullable', 'integer', 'min:1'],
            'required_fields' => ['nullable', 'array'],
            'optional_fields' => ['nullable', 'array'],
            'exam_specification_file_id' => ['nullable', 'exists:files,id'],
            'scholarship_amount' => ['nullable', 'numeric', 'min:0'],
            'registration_fee' => ['nullable', 'numeric', 'min:0'],
            'auto_register_students' => ['boolean'],
            'auto_register_to_leads' => ['boolean'],
            'multi_branch_application' => ['boolean'],
            'branch_ids' => ['nullable', 'array'],
            'branch_ids.*' => ['exists:classrooms,id'],
            'require_security_code' => ['boolean'],
            'security_code' => ['nullable', 'string', 'max:50'],
            'show_results_online' => ['boolean'],
            'results_publish_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:draft,open,closed,completed,cancelled'],
        ];
    }
}
