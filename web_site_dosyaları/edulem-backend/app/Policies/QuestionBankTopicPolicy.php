<?php

namespace App\Policies;

use App\Models\QuestionBankTopic;
use App\Models\User;

class QuestionBankTopicPolicy
{
    /**
     * Determine if the user can view any question bank topics.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the question bank topic.
     */
    public function view(User $user, QuestionBankTopic $questionBankTopic): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBankTopic->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create question bank topics.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the question bank topic.
     */
    public function update(User $user, QuestionBankTopic $questionBankTopic): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBankTopic->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the question bank topic.
     */
    public function delete(User $user, QuestionBankTopic $questionBankTopic): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBankTopic->tenant_id) {
            return false;
        }

        return $user->hasPermission('academic.delete');
    }
}
