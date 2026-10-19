<?php

namespace App\Policies;

use App\Models\OnlineExam;
use App\Models\User;

class OnlineExamPolicy
{
    /**
     * Determine if the user can view any online exams.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the online exam.
     */
    public function view(User $user, OnlineExam $onlineExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create online exams.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the online exam.
     */
    public function update(User $user, OnlineExam $onlineExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the online exam.
     */
    public function delete(User $user, OnlineExam $onlineExam): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $onlineExam->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
