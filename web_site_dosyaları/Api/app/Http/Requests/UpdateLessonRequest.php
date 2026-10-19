<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'short_code' => [
                'required', 
                'string', 
                'max:20', 
                // Güncelleme yaparken kendi ID'sini hariç tutarak unique kontrolü yapmalıyız
                Rule::unique('lessons', 'short_code')->ignore($this->lesson)
            ],
            'color'      => ['nullable', 'string', 'max:20'],
            'is_active'  => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'       => 'Ders adı zorunludur.',
            'short_code.required' => 'Ders kodu zorunludur.',
            'short_code.unique'   => 'Bu ders kodu zaten kullanılmış.',
        ];
    }
}