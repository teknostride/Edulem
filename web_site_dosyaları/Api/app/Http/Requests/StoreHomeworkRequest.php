<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHomeworkRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by policy in controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'lesson_id' => ['required', 'exists:lessons,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'assignment_mode' => ['nullable', Rule::in(['all_class', 'selected_students'])],
            'assigned_student_ids' => ['exclude_unless:assignment_mode,selected_students', 'required_if:assignment_mode,selected_students', 'array', 'min:1'],
            'assigned_student_ids.*' => ['integer', 'exists:students,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'file_id' => ['nullable', 'exists:files,id'],
            'is_active' => ['sometimes', 'boolean'],
            'is_online' => ['sometimes', 'boolean'],
            'question_ids' => ['required_if:is_online,true', 'nullable', 'array'],
            'question_ids.*' => ['exists:questions,id'],
            'is_project' => ['sometimes', 'boolean'],
            'project_topics' => ['required_if:is_project,true', 'nullable', 'array'],
            'project_topics.*' => ['string', 'max:255'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'lesson_id.required' => 'Ders seçimi zorunludur.',
            'lesson_id.exists' => 'Seçilen ders bulunamadı.',
            'classroom_id.exists' => 'Seçilen sınıf bulunamadı.',
            'assignment_mode.in' => 'Geçerli bir atama türü seçiniz.',
            'assigned_student_ids.required_if' => 'Seçili öğrenciler için en az bir öğrenci seçmelisiniz.',
            'assigned_student_ids.min' => 'Seçili öğrenciler için en az bir öğrenci seçmelisiniz.',
            'assigned_student_ids.*.exists' => 'Seçilen öğrencilerden biri bulunamadı.',
            'title.required' => 'Başlık zorunludur.',
            'title.max' => 'Başlık en fazla 255 karakter olabilir.',
            'description.max' => 'Açıklama en fazla 5000 karakter olabilir.',
            'due_date.required' => 'Teslim tarihi zorunludur.',
            'due_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'due_date.after_or_equal' => 'Teslim tarihi bugünden önce olamaz.',
            'file_id.exists' => 'Seçilen dosya bulunamadı.',
        ];
    }
}
