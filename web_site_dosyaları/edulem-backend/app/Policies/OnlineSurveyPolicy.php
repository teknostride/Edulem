<?php

namespace App\Policies;

use App\Models\OnlineSurvey;
use App\Models\User;

class OnlineSurveyPolicy
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
     * Determine if the user can view any online surveys.
     */
    public function viewAny(User $user): bool
    {
        return true; // Listeleme herkese açık olmalı. Herkes girdiği sayfaya göre filtreli listeyi alır.
    }

    /**
     * Determine if the user can view the online survey.
     */
    public function view(User $user, OnlineSurvey $onlineSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read') || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can create online surveys.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can update the online survey.
     */
    public function update(User $user, OnlineSurvey $onlineSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update') || $this->canViewAsStaff($user);
    }

    /**
     * Determine if the user can delete the online survey.
     */
    public function delete(User $user, OnlineSurvey $onlineSurvey): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineSurvey->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
