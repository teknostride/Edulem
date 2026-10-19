<?php

namespace App\Policies;

use App\Models\DutySchedule;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DutySchedulePolicy
{
    private array $managementRoles = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'];
    private array $managementRoleIds = [1, 2, 3, 4, 7, 10];

    private array $viewerRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen'];
    private array $viewerRoleIds = [5, 6];

    private function isManagement(User $user): bool
    {
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->managementRoleIds, true)) {
            return true;
        }

        $roleName = $user->role ? $user->role->name : null;

        return (bool) ($roleName && in_array($roleName, $this->managementRoles, true));
    }

    private function canViewAsStaff(User $user): bool
    {
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->viewerRoleIds, true)) {
            return true;
        }

        $roleName = $user->role ? $user->role->name : null;
        return (bool) ($roleName && in_array($roleName, $this->viewerRoles, true));
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($this->isManagement($user)) {
            return true;
        }

        if ($this->canViewAsStaff($user)) {
            return true;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, DutySchedule $dutySchedule): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($this->isManagement($user)) {
            return $user->tenant_id === $dutySchedule->tenant_id;
        }

        if ($this->canViewAsStaff($user)) {
            return $user->tenant_id === $dutySchedule->tenant_id;
        }

        return $user->hasPermission('academic.read') && $user->tenant_id === $dutySchedule->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($this->isManagement($user)) {
            return true;
        }

        return $user->hasPermission('academic.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, DutySchedule $dutySchedule): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($this->isManagement($user)) {
            return $user->tenant_id === $dutySchedule->tenant_id;
        }

        return $user->hasPermission('academic.update') && $user->tenant_id === $dutySchedule->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, DutySchedule $dutySchedule): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($this->isManagement($user)) {
            return $user->tenant_id === $dutySchedule->tenant_id;
        }

        return $user->hasPermission('academic.delete') && $user->tenant_id === $dutySchedule->tenant_id;
    }
}
