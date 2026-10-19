<?php

namespace App\Policies;

use App\Models\StaffAssignment;
use App\Models\User;

class StaffAssignmentPolicy
{
    /**
     * Determine if the user can view any staff assignments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the staff assignment.
     */
    public function view(User $user, StaffAssignment $staffAssignment): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $staffAssignment->tenant_id) {
            return false;
        }

        // Görevlendirilen personel veya yönetici görebilir
        if (in_array($user->id, $staffAssignment->assigned_staff_ids ?? [])) {
            return true;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create staff assignments.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the staff assignment.
     */
    public function update(User $user, StaffAssignment $staffAssignment): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $staffAssignment->tenant_id) {
            return false;
        }

        // Takım kaptanı veya yönetici güncelleyebilir
        if ($staffAssignment->team_leader_id === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the staff assignment.
     */
    public function delete(User $user, StaffAssignment $staffAssignment): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $staffAssignment->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
