<?php

namespace App\Policies;

use App\Models\QuestionTarget;
use App\Models\User;

class QuestionTargetPolicy
{
    /**
     * Determine if the user can view any question targets.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the question target.
     */
    public function view(User $user, QuestionTarget $questionTarget): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionTarget->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create question targets.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the question target.
     */
    public function update(User $user, QuestionTarget $questionTarget): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionTarget->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the question target.
     */
    public function delete(User $user, QuestionTarget $questionTarget): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionTarget->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
