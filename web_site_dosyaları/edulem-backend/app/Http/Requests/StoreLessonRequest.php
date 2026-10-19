<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
	{
		return [
			'name'       => ['required', 'string', 'max:255'],
			'short_code' => ['nullable', 'string', 'max:20'], // <-- 'required' yerine 'nullable' yaptık
			'color'      => ['nullable', 'string', 'max:20'],
			'is_active'  => ['boolean'],
		];
	}

    public function messages(): array
    {
        return [
            'name.required'       => 'Ders adı zorunludur.',
            'short_code.required' => 'Ders kodu (Kısa Kod) zorunludur.',
            'short_code.unique'   => 'Bu ders kodu zaten kullanılmış.',
            'color.max'           => 'Renk kodu çok uzun.',
        ];
    }
}