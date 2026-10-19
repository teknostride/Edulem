<?php

namespace App\Policies;

use App\Models\TutoringSession;
use App\Models\User;

class TutoringSessionPolicy
{
    private array $teacherRoles = [
        'öğretmen', 'ogretmen', 'sınıf öğretmeni', 'sinif ogretmeni', 'teacher',
        'rehberlik', 'guidance', 'rehber öğretmen', 'rehber ogretmen',
        'rehber_teacher', 'guidance_teacher',
    ];

    private array $managerRoles = [
        'owner', 'kurucu', 'kurum sahibi', 'institution_owner',
        'genel müdür', 'genel mudur', 'kampüs müdürü', 'kampus muduru',
        'müdür', 'mudur', 'müdür yardımcısı', 'mudur yardimcisi',
        'general_manager', 'campus_manager', 'school_principal',
        'admin', 'superadmin', 'yönetici', 'yonetici', 'manager',
        'öğrenci işleri', 'student_affairs',
    ];

    private function isManager(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->is_superadmin || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())) {
            return true;
        }

        if (!empty($user->role_id) && in_array((int) $user->role_id, [1, 2, 3, 4], true)) {
            return true;
        }

        $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
        return $roleName !== '' && in_array($roleName, $this->managerRoles, true);
    }

    private function isTeacher(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->role_id) && in_array((int) $user->role_id, [5, 6], true)) {
            return true;
        }

        $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
        if ($roleName === '') {
            return false;
        }

        if (in_array($roleName, $this->teacherRoles, true)) {
            return true;
        }

        return str_contains($roleName, 'öğretmen')
            || str_contains($roleName, 'ogretmen')
            || str_contains($roleName, 'teacher')
            || str_contains($roleName, 'rehber');
    }

    /**
     * Determine if the user can view any tutoring sessions.
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine if the user can view the tutoring session.
     */
    public function view(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi görebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        if ($this->isTeacher($user)) {
            return (int) $tutoringSession->teacher_id === (int) $user->id
                || $user->hasAnyPermission(['tutoring.read', 'tutoring.view', 'academic.read']);
        }

        return $user->hasAnyPermission(['tutoring.read', 'tutoring.view', 'academic.read']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can create tutoring sessions.
     */
    public function create(User $user): bool
    {
        if ($this->isManager($user) || $this->isTeacher($user)) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.create', 'academic.create']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the tutoring session.
     */
    public function update(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi güncelleyebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.update', 'academic.update']) || $user->is_superadmin;
    }

    /**
     * Determine if the user can delete the tutoring session.
     */
    public function delete(User $user, TutoringSession $tutoringSession): bool
    {
        if ($user->tenant_id && $tutoringSession->tenant_id && (int) $user->tenant_id !== (int) $tutoringSession->tenant_id && !$user->is_superadmin) {
            return false;
        }

        if ($this->isManager($user)) {
            return true;
        }

        // İlgili öğretmen veya oturumu oluşturan kişi silebilir
        if ((int) $tutoringSession->teacher_id === (int) $user->id || (int) $tutoringSession->created_by === (int) $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['tutoring.delete', 'academic.delete']) || $user->is_superadmin;
    }
}