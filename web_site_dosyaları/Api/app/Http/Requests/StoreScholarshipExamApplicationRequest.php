<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScholarshipExamApplicationRequest extends FormRequest
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
            'scholarship_exam_id' => ['required', 'exists:scholarship_exams,id'],
            'student_id' => ['nullable', 'exists:students,id'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'birth_date' => ['nullable', 'date'],
            'tc_identity_number' => ['nullable', 'string', 'size:11'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'grade_level' => ['nullable', 'string', 'max:50'],
            'branch_id' => ['nullable', 'exists:classrooms,id'],
            'session_id' => ['nullable', 'string'],
            'session_time' => ['nullable', 'date_format:H:i'],
            'security_code' => ['nullable', 'string'],
            'skip_security_code' => ['sometimes', 'boolean'],
            'additional_data' => ['nullable', 'array'],
        ];

        // Zorunlu alanları kontrol et
        $exam = $this->route('scholarshipExam') ?? \App\Models\ScholarshipExam::find($this->scholarship_exam_id);
        if ($exam && $exam->required_fields) {
            foreach ($exam->required_fields as $field) {
                if (!isset($rules[$field])) {
                    $rules[$field] = ['required'];
                } else {
                    // Zaten varsa required ekle
                    if (!in_array('required', $rules[$field])) {
                        array_unshift($rules[$field], 'required');
                    }
                }
            }
        }

        return $rules;
    }
}
