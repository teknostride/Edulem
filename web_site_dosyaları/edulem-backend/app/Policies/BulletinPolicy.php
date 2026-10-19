<?php

namespace App\Policies;

use App\Models\Bulletin;
use App\Models\User;

class BulletinPolicy
{
    /**
     * Determine if the user can view any bulletins.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the bulletin.
     */
    public function view(User $user, Bulletin $bulletin): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletin->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create bulletins.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the bulletin.
     */
    public function update(User $user, Bulletin $bulletin): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletin->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the bulletin.
     */
    public function delete(User $user, Bulletin $bulletin): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletin->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
