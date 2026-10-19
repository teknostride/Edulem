<?php

namespace App\Policies;

use App\Models\ExamClassroom;
use App\Models\User;

class ExamClassroomPolicy
{
    /**
     * Determine if the user can view any exam classrooms.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the exam classroom.
     */
    public function view(User $user, ExamClassroom $examClassroom): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $examClassroom->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create exam classrooms.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the exam classroom.
     */
    public function update(User $user, ExamClassroom $examClassroom): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $examClassroom->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the exam classroom.
     */
    public function delete(User $user, ExamClassroom $examClassroom): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $examClassroom->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
