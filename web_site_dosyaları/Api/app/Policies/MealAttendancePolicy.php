<?php

namespace App\Policies;

use App\Models\MealAttendance;
use App\Models\User;

class MealAttendancePolicy
{
    /**
     * Determine if the user can view any meal attendances.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the meal attendance.
     */
    public function view(User $user, MealAttendance $mealAttendance): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $mealAttendance->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create meal attendances.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the meal attendance.
     */
    public function update(User $user, MealAttendance $mealAttendance): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $mealAttendance->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the meal attendance.
     */
    public function delete(User $user, MealAttendance $mealAttendance): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $mealAttendance->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
