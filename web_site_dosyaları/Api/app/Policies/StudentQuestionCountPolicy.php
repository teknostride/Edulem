<?php

namespace App\Policies;

use App\Models\StudentQuestionCount;
use App\Models\User;

class StudentQuestionCountPolicy
{
    /**
     * Determine if the user can view any student question counts.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the student question count.
     */
    public function view(User $user, StudentQuestionCount $studentQuestionCount): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $studentQuestionCount->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create student question counts.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the student question count.
     */
    public function update(User $user, StudentQuestionCount $studentQuestionCount): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $studentQuestionCount->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the student question count.
     */
    public function delete(User $user, StudentQuestionCount $studentQuestionCount): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $studentQuestionCount->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
