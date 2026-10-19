<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateExamRequest extends FormRequest
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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'lesson_id' => ['sometimes', 'required', 'exists:lessons,id'],
            'classroom_id' => ['nullable', 'exists:classrooms,id'],
            'exam_date' => ['sometimes', 'required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'total_points' => ['sometimes', 'required', 'integer', 'min:1', 'max:1000'],
            'type' => ['sometimes', 'required', 'string', Rule::in(['written', 'multiple_choice', 'online', 'oral'])],
            'is_optical_form' => ['sometimes', 'boolean'],
            'optical_form_file_id' => ['required_if:is_optical_form,true', 'nullable', 'exists:files,id'],
            'optical_form_status' => ['sometimes', 'string', Rule::in(['pending', 'uploaded', 'processed', 'error'])],
            'optical_form_notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
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
            'name.required' => 'Sınav adı zorunludur.',
            'name.max' => 'Sınav adı en fazla 255 karakter olabilir.',
            'description.max' => 'Açıklama en fazla 5000 karakter olabilir.',
            'lesson_id.required' => 'Ders seçimi zorunludur.',
            'lesson_id.exists' => 'Seçilen ders bulunamadı.',
            'classroom_id.exists' => 'Seçilen sınıf bulunamadı.',
            'exam_date.required' => 'Sınav tarihi zorunludur.',
            'exam_date.date' => 'Geçerli bir tarih formatı giriniz.',
            'duration_minutes.integer' => 'Süre bir sayı olmalıdır.',
            'duration_minutes.min' => 'Süre en az 1 dakika olmalıdır.',
            'duration_minutes.max' => 'Süre en fazla 600 dakika olabilir.',
            'total_points.required' => 'Toplam puan zorunludur.',
            'total_points.integer' => 'Toplam puan bir sayı olmalıdır.',
            'total_points.min' => 'Toplam puan en az 1 olmalıdır.',
            'total_points.max' => 'Toplam puan en fazla 1000 olabilir.',
            'type.required' => 'Sınav tipi zorunludur.',
            'type.in' => 'Geçerli bir sınav tipi seçiniz.',
        ];
    }
}
