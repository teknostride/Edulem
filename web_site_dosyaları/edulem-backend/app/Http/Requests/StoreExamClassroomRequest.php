<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamClassroomRequest extends FormRequest
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
            'classroom_ids' => ['required', 'array', 'min:1'],
            'classroom_ids.*' => ['exists:classrooms,id'],
            'shuffle' => ['sometimes', 'boolean'],
            'sort_by' => ['sometimes', 'in:surname,classroom,room'],
            'preserve_classroom' => ['sometimes', 'boolean'],
            'capacity' => ['sometimes', 'array'],
            'capacity.*' => ['integer', 'min:1'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'classroom_ids.required' => 'En az bir derslik seçilmelidir.',
            'classroom_ids.array' => 'Derslikler dizi formatında olmalıdır.',
            'classroom_ids.min' => 'En az bir derslik seçilmelidir.',
            'sort_by.in' => 'Sıralama türü geçersiz. (surname, classroom, room)',
        ];
    }
}
