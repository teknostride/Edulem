<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email') && trim((string)$this->email) === '') {
            $this->merge(['email' => null]);
        }
        if ($this->has('guardians') && is_array($this->guardians)) {
            $guardians = $this->guardians;
            foreach ($guardians as $k => $g) {
                if (isset($g['email']) && trim((string)$g['email']) === '') {
                    $guardians[$k]['email'] = null;
                }
            }
            $this->merge(['guardians' => $guardians]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();
        $tenantId = $user ? (int) $user->tenant_id : null;
        $routeId = $this->route('id');
        $studentId = is_numeric($routeId) ? (int) $routeId : null;
        $educationLevelId = $this->input('education_level_id');
        $educationLevelId = ($educationLevelId !== null && $educationLevelId !== '') ? (int) $educationLevelId : null;
        
        // Sezon bilgisini belirle
        $seasonId = $this->input('season_id') ?? $this->header('X-Season-Id');
        if (!$seasonId && $user) {
            $seasonId = \Illuminate\Support\Facades\Cache::remember("active_season_tenant_{$user->tenant_id}", 3600, function () use ($user) {
                return \App\Models\Season::where('tenant_id', $user->tenant_id)
                    ->where('is_active', true)
                    ->value('id');
            });
        }
        $seasonId = $seasonId ? (int) $seasonId : null;
        $isActiveInput = $this->input('is_active');
        $isActiveBool = in_array($isActiveInput, [true, 1, '1', 'true'], true);

        return [
            // Referans: Zorunlu alanlar – Ad Soyad, Okul No, Veli E-posta, Sınıf
            'student_name' => ['required', 'string', 'max:255'],
            'school_no' => array_filter([
                'required',
                'string',
                'max:50',
                $isActiveBool
                    ? Rule::unique('students', 'school_no')
                        ->when($studentId, fn ($r) => $r->ignore($studentId))
                        ->where(function ($q) use ($tenantId, $educationLevelId, $seasonId) {
                            if ($tenantId) {
                                $q->where('tenant_id', $tenantId);
                            }
                            if ($seasonId) {
                                $q->where('season_id', $seasonId);
                            }
                            if ($educationLevelId) {
                                $q->where('education_level_id', $educationLevelId);
                            }
                            $q->where('is_active', true);
                        })
                    : null,
            ]),
            'classroom_id' => ['required', 'integer', 'exists:classrooms,id'],
            'is_active' => ['required', 'boolean'],

            // Referans: Zorunlu alanlar – TC, Doğum Tarihi, Cinsiyet
            'tc_no' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    $clean = preg_replace('/\D/', '', (string) $value);
                    if ($clean === '') return;
                    if (strlen($clean) !== 11) {
                        $fail("Öğrenci TC Kimlik No ({$clean}) 11 haneli olmalıdır.");
                        return;
                    }
                    $failMsg = null;
                    (new \App\Rules\ValidTcKimlikNo())->validate($attribute, $clean, function ($msg) use (&$failMsg, $clean) {
                        $failMsg = "Öğrenci TC ({$clean}): {$msg}";
                    });
                    if ($failMsg) $fail($failMsg);
                },
            ],
            'birth_date' => ['required', 'date'],
            'gender' => ['required', 'in:male,female'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],

            // İletişim ve adres (opsiyonel)
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'district_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) {
                    if ($value !== null && $value !== 0 && $value !== '0' && $value > 0) {
                        if (!\App\Models\District::where('id', $value)->exists()) {
                            $fail('Seçilen ilçe geçersiz.');
                        }
                    }
                }
            ],

            'campus_id' => ['nullable', 'integer', 'exists:campuses,id'],
            'education_level_id' => ['nullable', 'integer', 'exists:education_levels,id'],
            'password' => ['nullable', 'string', 'min:4', 'max:50'],
            'is_portal_active' => ['nullable', 'boolean'],

            // Veli bilgileri tamamen opsiyonel
            'guardians' => ['nullable', 'array'],
            'guardians.*.id' => ['nullable', 'string', 'max:36'],
            'guardians.0.email' => ['nullable', 'email', 'max:255'],
            'guardians.*.name' => ['nullable', 'string', 'max:255'],
            'guardians.*.tc_no' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) {
                    $clean = preg_replace('/\D/', '', (string) $value);
                    if ($clean === '') return;
                    // Parse index from attribute name: guardians.0.tc_no → 1. Veli
                    preg_match('/guardians\.(\d+)\./', $attribute, $m);
                    $idx = isset($m[1]) ? (int)$m[1] + 1 : '?';
                    if (strlen($clean) !== 11) {
                        $fail("{$idx}. Veli TC Kimlik No ({$clean}) 11 haneli olmalıdır.");
                        return;
                    }
                    $failMsg = null;
                    (new \App\Rules\ValidTcKimlikNo())->validate($attribute, $clean, function ($msg) use (&$failMsg, $clean, $idx) {
                        $failMsg = "{$idx}. Veli TC ({$clean}): {$msg}";
                    });
                    if ($failMsg) $fail($failMsg);
                },
            ],
            'guardians.*.phone' => ['nullable', 'string', 'max:20'],
            'guardians.*.email' => ['nullable', 'email', 'max:255'],
            'guardians.*.job' => ['nullable', 'string', 'max:255'],
            'guardians.*.relation_type' => ['nullable', 'string', 'in:father,mother,guardian,other'],
            'guardians.*.is_legal_guardian' => ['nullable', 'boolean'],

            'emergency_contact_info' => ['nullable', 'array'],
            'emergency_contact_info.name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_info.phone' => ['nullable', 'string', 'max:20'],
            'emergency_contact_info.relation' => ['nullable', 'string', 'max:100'],

            'sibling_ids' => ['nullable', 'array'],
            'sibling_ids.*' => ['integer', 'exists:students,id'],
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
            'student_name.required' => 'Ad soyad zorunludur.',
            'school_no.required' => 'Okul numarası zorunludur.',
            'classroom_id.required' => 'Sınıf seçimi zorunludur.',
            'is_active.required' => 'Öğrenci durumu zorunludur.',
            'tc_no.required' => 'TC Kimlik No zorunludur.',
            'birth_date.required' => 'Doğum tarihi zorunludur.',
            'gender.required' => 'Cinsiyet zorunludur.',
            'tc_no.size' => 'TC Kimlik No 11 haneli olmalıdır.',
            'birth_date.date' => 'Geçerli bir doğum tarihi giriniz.',
            'gender.in' => 'Cinsiyet erkek veya kadın olmalıdır.',
            'email.email' => 'Geçerli bir e-posta adresi giriniz.',
        ];
    }
}
