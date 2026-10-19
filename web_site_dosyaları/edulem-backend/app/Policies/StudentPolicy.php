<?php

namespace App\Policies;

use App\Models\Student;
use App\Models\User;

class StudentPolicy
{
    /**
     * Determine if the user can view any students.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('students.read');
    }

    /**
     * Determine if the user can view the student.
     */
    public function view(User $user, Student $student): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $student->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('students.read')) {
            return false;
        }

        // Row-Level Security: Rehber öğretmen sadece sorumlu olduğu öğrencileri görebilir
        if ($user->role && $user->role->name === 'guidance') {
            // İleride guidance_students pivot tablosu eklendiğinde kontrol edilecek
            // return $student->guidanceTeachers->contains($user->id);
            return true; // Şimdilik tüm öğrencileri görebilir
        }

        // Row-Level Security: Öğretmen sadece kendi sınıfındaki öğrencileri görebilir
        if ($user->role && $user->role->name === 'teacher') {
            // İleride classroom_students pivot tablosu eklendiğinde kontrol edilecek
            // return $student->classrooms->where('teacher_id', $user->id)->isNotEmpty();
            return true; // Şimdilik tüm öğrencileri görebilir
        }

        // Row-Level Security: Branch Manager (Kademe Müdürü) sadece kendi branch'indeki öğrencileri görebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            // Öğrencinin sınıfı ve branch'i kontrol et
            if ($student->classroom && $student->classroom->branch_id) {
                return in_array($student->classroom->branch_id, $managedBranchIds);
            }
            
            // Eğer öğrencinin sınıfı yoksa, branch manager göremez
            return false;
        }

        return true;
    }

    /**
     * Determine if the user can create students.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('students.create');
    }

    /**
     * Determine if the user can update the student.
     */
    public function update(User $user, Student $student): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $student->tenant_id) {
            return false;
        }

        return $user->hasPermission('students.update');
    }

    /**
     * Determine if the user can delete the student.
     */
    public function delete(User $user, Student $student): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $student->tenant_id) {
            return false;
        }

        return $user->hasPermission('students.delete');
    }
}
