<?php

namespace App\Policies;

use App\Models\ScholarshipExam;
use App\Models\User;

class ScholarshipExamPolicy
{
    /**
     * Determine if the user can view any scholarship exams.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the scholarship exam.
     */
    public function view(User $user, ScholarshipExam $scholarshipExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $scholarshipExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create scholarship exams.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the scholarship exam.
     */
    public function update(User $user, ScholarshipExam $scholarshipExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $scholarshipExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the scholarship exam.
     */
    public function delete(User $user, ScholarshipExam $scholarshipExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $scholarshipExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
