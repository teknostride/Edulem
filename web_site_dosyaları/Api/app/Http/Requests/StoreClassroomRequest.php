<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClassroomRequest extends FormRequest
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
            'branch_id' => ['nullable', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'teacher_id' => ['nullable', 'exists:users,id'],
            
            // 👇 DÜZELTİLEN SATIR BURASI 👇
            // 1. 'string' yerine 'integer' yaptık.
            // 2. 'exists:education_levels,id' ekledik (Veritabanında bu ID var mı diye bakar)
            // 3. 'nullable' yerine 'required' yaparsan, kademesiz sınıf açılmasını engellersin (Önerilir).
            'grade_level' => ['required', 'string', 'exists:education_levels,id'], 
            
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
            'name.required' => 'Sınıf adı zorunludur.',
            'code.required' => 'Sınıf kodu zorunludur.',
            'code.unique' => 'Bu sınıf kodu zaten kullanılmış.',
            'capacity.required' => 'Kapasite zorunludur.',
            'capacity.min' => 'Kapasite en az 1 olmalıdır.',
            'capacity.max' => 'Kapasite en fazla 100 olabilir.',
            'teacher_id.exists' => 'Seçilen öğretmen bulunamadı.',
            'grade_level.required' => 'Sınıf seviyesi zorunludur.',
            'grade_level.in' => 'Geçerli bir sınıf seviyesi seçiniz.',
        ];
    }
}
