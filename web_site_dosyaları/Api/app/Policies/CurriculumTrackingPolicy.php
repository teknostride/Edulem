<?php

namespace App\Policies;

use App\Models\CurriculumTracking;
use App\Models\User;

class CurriculumTrackingPolicy
{
    /**
     * Determine if the user can view any curriculum tracking records.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the curriculum tracking record.
     */
    public function view(User $user, CurriculumTracking $curriculumTracking): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $curriculumTracking->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create curriculum tracking records.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the curriculum tracking record.
     */
    public function update(User $user, CurriculumTracking $curriculumTracking): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $curriculumTracking->tenant_id) {
            return false;
        }

        // Öğretmen sadece kendi kayıtlarını güncelleyebilir (idare hariç)
        if ($user->id === $curriculumTracking->teacher_id) {
            return $user->hasPermission('academic.update');
        }

        return $user->hasPermission('admin');
    }

    /**
     * Determine if the user can delete the curriculum tracking record.
     */
    public function delete(User $user, CurriculumTracking $curriculumTracking): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $curriculumTracking->tenant_id) {
            return false;
        }

        // Öğretmen sadece kendi kayıtlarını silebilir (idare hariç)
        if ($user->id === $curriculumTracking->teacher_id) {
            return $user->hasPermission('academic.delete');
        }

        return $user->hasPermission('admin');
    }
}
