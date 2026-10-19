<?php

namespace App\Policies;

use App\Models\QuestionDailyLimit;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class QuestionDailyLimitPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, QuestionDailyLimit $limit): bool
    {
        return $user->hasPermission('communication.read') && $user->tenant_id === $limit->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('communication.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, QuestionDailyLimit $limit): bool
    {
        return $user->hasPermission('communication.update') && $user->tenant_id === $limit->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, QuestionDailyLimit $limit): bool
    {
        return $user->hasPermission('communication.delete') && $user->tenant_id === $limit->tenant_id;
    }
}
