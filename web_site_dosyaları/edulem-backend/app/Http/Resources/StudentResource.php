<?php

namespace App\Http\Resources;

use App\Models\Campus;
use App\Models\EducationLevel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $roleName = $request->user() && $request->user()->role ? $request->user()->role->name : null;
        $isTeacherRole = in_array($roleName, ['Öğretmen', 'Sınıf Öğretmeni', 'teacher'], true);

        $classroom = $this->classroom;
        $campusId = $classroom?->educationLevel?->campus_id
            ?? $this->educationLevel?->campus_id
            ?? $classroom?->educationLevel?->campus?->id
            ?? $this->educationLevel?->campus?->id
            ?? $classroom?->branch?->campus_id
            ?? $classroom?->branch?->campus?->id
            ?? $classroom?->campus_id
            ?? $classroom?->campus?->id
            ?? null;

        $campusName = $classroom?->educationLevel?->campus?->name
            ?? $this->educationLevel?->campus?->name
            ?? $classroom?->branch?->campus?->name
            ?? $classroom?->campus?->name
            ?? null;

        $educationLevelId = $classroom?->educationLevel?->id 
            ?? $this->education_level_id 
            ?? $classroom?->grade_level 
            ?? null;
            
        $educationLevelName = $classroom?->educationLevel?->name 
            ?? $this->educationLevel?->name 
            ?? null;

        // Eğer educationLevel relationship yoksa ama grade_level doluysa, kampüs id'sini kademeden çöz
        if (! $campusId && $educationLevelId) {
            static $levelCampusCache = [];
            $levelKey = (int) $educationLevelId;
            if (! array_key_exists($levelKey, $levelCampusCache)) {
                $levelCampusCache[$levelKey] = EducationLevel::query()->whereKey($levelKey)->value('campus_id');
            }
            $campusIdFromLevel = $levelCampusCache[$levelKey] ? (int) $levelCampusCache[$levelKey] : null;
            if ($campusIdFromLevel) {
                $campusId = $campusIdFromLevel;
            }
        }

        if (! $campusName && $campusId) {
            static $campusNameCache = [];
            $campusKey = (int) $campusId;
            if (! array_key_exists($campusKey, $campusNameCache)) {
                $campusNameCache[$campusKey] = Campus::query()->whereKey($campusKey)->value('name');
            }
            $campusName = $campusNameCache[$campusKey] ?: null;
        }

        if (! $educationLevelName && $educationLevelId) {
            static $levelNameCache = [];
            $key = (int) $educationLevelId;
            if (! array_key_exists($key, $levelNameCache)) {
                $levelNameCache[$key] = EducationLevel::query()->whereKey($key)->value('name');
            }
            $educationLevelName = $levelNameCache[$key] ?: null;
        }

        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'student_name' => $this->name,
            'school_no' => $this->school_no,
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'gender' => $this->gender,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'city_id' => $this->city_id,
            'district_id' => $this->district_id,
            'classroom_id' => $this->classroom_id,
            'campus_id' => $campusId,
            'education_level_id' => $educationLevelId,
            'campus_name' => $campusName,
            'education_level_name' => $educationLevelName,
            'is_active' => $this->is_active,
            'emergency_contact_info' => $this->emergency_contact_info,
            'guardians' => $this->whenLoaded('guardians', function () use ($isTeacherRole) {
                return $this->guardians->map(function ($g) use ($isTeacherRole) {
                    $guardian = [
                        'id' => $g->id,
                        'name' => $g->name,
                        'phone' => $g->phone,
                        'email' => $g->email,
                        'relation_type' => $g->pivot->relation_type ?? 'other',
                        'is_legal_guardian' => (bool) ($g->pivot->is_legal_guardian ?? false),
                    ];

                    if (! $isTeacherRole) {
                        $guardian['tc_no'] = $g->tc_no;
                        $guardian['job'] = $g->job;
                    }

                    return $guardian;
                });
            }),
            'city' => $this->when($this->city, function () {
                return [
                    'id' => $this->city->id,
                    'name' => $this->city->name,
                ];
            }),
            'district' => $this->when($this->district, function () {
                return [
                    'id' => $this->district->id,
                    'name' => $this->district->name,
                ];
            }),
            'classroom' => $this->whenLoaded('classroom', function () {
                $classroom = $this->classroom;

                return [
                    'id' => $classroom->id,
                    'name' => $classroom->name,
                    'grade_level' => $classroom->grade_level,
                    'branch' => $classroom->relationLoaded('branch') && $classroom->branch ? [
                        'id' => $classroom->branch->id,
                        'name' => $classroom->branch->name,
                        'campus' => $classroom->branch->relationLoaded('campus') && $classroom->branch->campus ? [
                            'id' => $classroom->branch->campus->id,
                            'name' => $classroom->branch->campus->name,
                        ] : null,
                    ] : null,
                    'education_level' => $classroom->relationLoaded('educationLevel') && $classroom->educationLevel ? [
                        'id' => $classroom->educationLevel->id,
                        'name' => $classroom->educationLevel->name,
                        'campus' => $classroom->educationLevel->relationLoaded('campus') && $classroom->educationLevel->campus ? [
                            'id' => $classroom->educationLevel->campus->id,
                            'name' => $classroom->educationLevel->campus->name,
                        ] : null,
                    ] : null,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'sibling_ids' => $this->sibling_ids,
            'siblings' => $this->whenLoaded('siblings', function () {
                return $this->siblings->map(function ($s) {
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'student_name' => $s->name,
                        'school_no' => $s->school_no,
                        'tc_no' => $s->tc_no,
                        'classroom_name' => $s->classroom?->name,
                    ];
                });
            }),
        ];

        if (! $isTeacherRole) {
            $data['tc_no'] = $this->tc_no;
        }

        return $data;
    }
}
