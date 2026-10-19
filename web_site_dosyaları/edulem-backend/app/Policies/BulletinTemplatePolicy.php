<?php

namespace App\Policies;

use App\Models\BulletinTemplate;
use App\Models\User;

class BulletinTemplatePolicy
{
    /**
     * Determine if the user can view any bulletin templates.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the bulletin template.
     */
    public function view(User $user, BulletinTemplate $bulletinTemplate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletinTemplate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create bulletin templates.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the bulletin template.
     */
    public function update(User $user, BulletinTemplate $bulletinTemplate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletinTemplate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the bulletin template.
     */
    public function delete(User $user, BulletinTemplate $bulletinTemplate): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $bulletinTemplate->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
