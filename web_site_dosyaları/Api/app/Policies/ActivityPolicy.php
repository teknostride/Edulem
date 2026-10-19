<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    /**
     * Determine if the user can view any activities.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the activity.
     */
    public function view(User $user, Activity $activity): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $activity->tenant_id) {
            return false;
        }

        // Yayınlanmamış etkinlikler sadece idare görebilir
        if (!$activity->isPublished() && !$user->hasPermission('admin')) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create activities.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the activity.
     */
    public function update(User $user, Activity $activity): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $activity->tenant_id) {
            return false;
        }

        // Oluşturan veya idare güncelleyebilir
        if ($user->id === $activity->created_by) {
            return $user->hasPermission('academic.update');
        }

        // İdare onaylama yapabilir
        if ($activity->requires_admin_approval && $user->hasPermission('admin')) {
            return true;
        }

        return $user->hasPermission('admin');
    }

    /**
     * Determine if the user can delete the activity.
     */
    public function delete(User $user, Activity $activity): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $activity->tenant_id) {
            return false;
        }

        // Oluşturan veya idare silebilir
        if ($user->id === $activity->created_by) {
            return $user->hasPermission('academic.delete');
        }

        return $user->hasPermission('admin');
    }
}
