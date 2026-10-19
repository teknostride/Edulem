<?php

namespace App\Policies;

use App\Models\Homework;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class HomeworkPolicy
{
    private array $teacherOnlyRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher'];
    private array $teacherOnlyRoleIds = [5, 6];

    private array $managerRoles = [
        'owner', 'Kurucu', 'Kurum Sahibi', 'institution_owner',
        'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı',
        'general_manager', 'campus_manager', 'school_principal',
    ];

    private function isTeacherOnly($user): bool
    {
        if (!$user instanceof User) {
            return false;
        }
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->teacherOnlyRoleIds, true)) {
            return true;
        }

        $roleName = $user->role ? $user->role->name : null;
        return $roleName && in_array($roleName, $this->teacherOnlyRoles, true);
    }

    private function isStudentAffairs($user): bool
    {
        if (!$user instanceof User) {
            return false;
        }
        $roleName = $user->role ? $user->role->name : null;
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    private function isManagerRole($user): bool
    {
        if (!$user instanceof User) {
            return false;
        }
        $roleName = $user->role ? $user->role->name : null;
        return $roleName && in_array($roleName, $this->managerRoles, true);
    }

    /**
     * Determine whether the user can view any models.
     * Öğretmen, Kurucu, Müdür, Müdür Yardımcısı vb. ödev listesini görebilir.
     */
    public function viewAny($user): bool
    {
        if ($user instanceof \App\Models\Student || $user instanceof \App\Models\Guardian) {
            return true;
        }

        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if (method_exists($user, 'hasPermission') && $user->hasPermission('academic.read')) {
            return true;
        }

        if ($this->isTeacherOnly($user)) {
            return true;
        }
        $roleName = $user->role ? $user->role->name : null;
        return in_array($roleName, [
            'owner', 'Kurucu', 'Kurum Sahibi', 'institution_owner',
            'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı',
            'Öğretmen', 'Sınıf Öğretmeni',
        ], true);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view($user, Homework $homework): bool
    {
        if ($user instanceof \App\Models\Student) {
            if ((int) $user->tenant_id !== (int) $homework->tenant_id) {
                return false;
            }
            if ($homework->classroom_id && (int) $homework->classroom_id === (int) $user->classroom_id) {
                return true;
            }
            return $homework->students()->where('students.id', $user->id)->exists();
        }

        if ($user instanceof \App\Models\Guardian) {
            return (int) $user->tenant_id === (int) $homework->tenant_id;
        }

        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->tenant_id !== $homework->tenant_id) {
            return false;
        }

        if (method_exists($user, 'hasPermission') && $user->hasPermission('academic.read')) {
            return true;
        }

        if ($this->isManagerRole($user)) {
            return true;
        }

        $isTeacherOnly = $this->isTeacherOnly($user);
        if ($isTeacherOnly) {
            if ((int) $homework->teacher_id === (int) $user->id) {
                return true;
            }

            return Schedule::query()
                ->where('tenant_id', $user->tenant_id)
                ->forTeacher($user->id)
                ->where('lesson_id', $homework->lesson_id)
                ->when($homework->classroom_id, fn ($q) => $q->where('classroom_id', $homework->classroom_id))
                ->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create($user): bool
    {
        if (!$user instanceof User) {
            return false;
        }
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->hasPermission('academic.create')) {
            return true;
        }

        if ($this->isManagerRole($user)) {
            return true;
        }

        return $this->isTeacherOnly($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update($user, Homework $homework): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->tenant_id !== $homework->tenant_id) {
            return false;
        }

        if ($this->isManagerRole($user)) {
            return true;
        }

        // Yetkili roller tüm ödevleri güncelleyebilir
        if ($user->hasPermission('academic.update')) {
            $role = $user->role ?? null;
            if ($role && in_array($role->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'general_manager', 'campus_manager', 'school_principal'], true)) {
                return true;
            }
        }

        // Öğretmen sadece kendi ödevlerini veya atandığı (ana/yardımcı) ders-sınıf ödevlerini güncelleyebilir/kontrol edebilir
        $isTeacherOnly = $this->isTeacherOnly($user);
        if ($isTeacherOnly) {
            if ((int) $homework->teacher_id === (int) $user->id) {
                return true;
            }

            return Schedule::query()
                ->where('tenant_id', $user->tenant_id)
                ->forTeacher($user->id)
                ->where('lesson_id', $homework->lesson_id)
                ->when($homework->classroom_id, fn ($q) => $q->where('classroom_id', $homework->classroom_id))
                ->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete($user, Homework $homework): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->tenant_id !== $homework->tenant_id) {
            return false;
        }

        if ($this->isManagerRole($user)) {
            return true;
        }

        if ($user->hasPermission('academic.delete')) {
            $role = $user->role ?? null;
            if ($role && in_array($role->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'general_manager', 'campus_manager', 'school_principal'], true)) {
                return true;
            }
        }

        $isTeacherOnly = $this->isTeacherOnly($user);
        if ($isTeacherOnly) {
            return (int) $homework->teacher_id === (int) $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore($user, Homework $homework): bool
    {
        return $this->delete($user, $homework);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete($user, Homework $homework): bool
    {
        return $this->delete($user, $homework);
    }
}
