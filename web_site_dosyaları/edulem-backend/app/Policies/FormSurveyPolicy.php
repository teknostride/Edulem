<?php

namespace App\Policies;

use App\Models\FormSurvey;
use App\Models\User;

class FormSurveyPolicy
{
    private array $viewerRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen', 'guidance', 'teacher', 'rehber_teacher', 'guidance_teacher', 'Öğrenci İşleri', 'student_affairs', 'ogrenci_isleri'];
    private array $viewerRoleIds = [5, 6, 7];

    private function canViewAsStaff(User $user): bool
    {
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->viewerRoleIds, true)) {
            return true;
        }

        $roleName = $user->role ? $user->role->name : null;
        return (bool) ($roleName && in_array($roleName, $this->viewerRoles, true));
    }

    /**
     * Determine if the user can view any form surveys.
     */
    public function viewAny(User $user): bool
    {
        return true; // Listeleme herkese açık olmalı. Formlara göre filtre Backend Controller'da yapılır.
    }

    /**
     * Determine if the user can view the form survey.
     */
    public function view(User $user, FormSurvey $formSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read') || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can create form surveys.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can update the form survey.
     */
    public function update(User $user, FormSurvey $formSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update') || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can delete the form survey.
     */
    public function delete(User $user, FormSurvey $formSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $formSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
