<?php

namespace App\Policies;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SubscriptionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Herkes kendi tenant'ının aboneliklerini görebilir
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Subscription $subscription): bool
    {
        if ($user->tenant_id !== $subscription->tenant_id) {
            return false;
        }

        // Yöneticiler görebilir
        return $user->hasPermission('academic.read') || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Sadece yöneticiler ve SuperAdmin abonelik oluşturabilir
        return $user->hasPermission('academic.create') || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Subscription $subscription): bool
    {
        if ($user->tenant_id !== $subscription->tenant_id) {
            return false;
        }

        // Sadece yöneticiler ve SuperAdmin güncelleyebilir
        return $user->hasPermission('academic.update') || $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Subscription $subscription): bool
    {
        if ($user->tenant_id !== $subscription->tenant_id) {
            return false;
        }

        // Sadece SuperAdmin silebilir
        return $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Subscription $subscription): bool
    {
        return $this->delete($user, $subscription);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Subscription $subscription): bool
    {
        return $this->delete($user, $subscription);
    }
}
