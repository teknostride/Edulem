<?php

namespace App\Policies;

use App\Models\Grade;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class GradePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Grade $grade): bool
    {
        return $user->hasPermission('academic.read') && $user->tenant_id === $grade->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Grade $grade): bool
    {
        // Öğretmen sadece kendi girdiği notları güncelleyebilir
        if ($user->hasPermission('academic.update')) {
            // Genel müdür ve yöneticiler tüm notları güncelleyebilir
            $role = $user->role ?? null;
            if ($role && in_array($role->name, ['general_manager', 'campus_manager', 'school_principal'])) {
                return $user->tenant_id === $grade->tenant_id;
            }
            // Öğretmen sadece kendi girdiği notları güncelleyebilir
            return $user->tenant_id === $grade->tenant_id && $user->id === $grade->teacher_id;
        }
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Grade $grade): bool
    {
        // Öğretmen sadece kendi girdiği notları silebilir
        if ($user->hasPermission('academic.delete')) {
            // Genel müdür ve yöneticiler tüm notları silebilir
            $role = $user->role ?? null;
            if ($role && in_array($role->name, ['general_manager', 'campus_manager', 'school_principal'])) {
                return $user->tenant_id === $grade->tenant_id;
            }
            // Öğretmen sadece kendi girdiği notları silebilir
            return $user->tenant_id === $grade->tenant_id && $user->id === $grade->teacher_id;
        }
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Grade $grade): bool
    {
        return $this->delete($user, $grade);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Grade $grade): bool
    {
        return $this->delete($user, $grade);
    }
}
