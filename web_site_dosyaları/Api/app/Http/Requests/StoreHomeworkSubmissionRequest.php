<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHomeworkSubmissionRequest extends FormRequest
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
            'homework_id' => ['required', 'exists:homeworks,id'],
            'student_id' => ['required', 'exists:students,id'],
            'answers' => ['required_if:homework_type,online', 'nullable', 'array'],
            'file_id' => ['required_if:homework_type,file', 'nullable', 'exists:files,id'],
            'project_topic_id' => ['required_if:homework_type,project', 'nullable', 'integer'],
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
            'homework_id.required' => 'Ödev seçimi zorunludur.',
            'homework_id.exists' => 'Seçilen ödev bulunamadı.',
            'student_id.required' => 'Öğrenci seçimi zorunludur.',
            'student_id.exists' => 'Seçilen öğrenci bulunamadı.',
            'answers.required_if' => 'Online ödev için cevaplar zorunludur.',
            'answers.array' => 'Cevaplar array formatında olmalıdır.',
            'file_id.required_if' => 'Dosya ödevi için dosya yüklemesi zorunludur.',
            'file_id.exists' => 'Seçilen dosya bulunamadı.',
            'project_topic_id.required_if' => 'Proje ödevi için konu seçimi zorunludur.',
        ];
    }
}
