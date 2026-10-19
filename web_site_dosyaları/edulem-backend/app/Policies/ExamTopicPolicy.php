<?php

namespace App\Policies;

use App\Models\ExamTopic;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ExamTopicPolicy
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
    public function view(User $user, ExamTopic $topic): bool
    {
        return $user->hasPermission('academic.read') && $user->tenant_id === $topic->tenant_id;
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
    public function update(User $user, ExamTopic $topic): bool
    {
        return $user->hasPermission('academic.update') && $user->tenant_id === $topic->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ExamTopic $topic): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $topic->tenant_id;
    }
}
