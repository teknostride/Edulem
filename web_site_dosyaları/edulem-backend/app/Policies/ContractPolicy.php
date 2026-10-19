<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ContractPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->hasPermission('finance.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Contract $contract): bool
    {
        if ($user->tenant_id !== $contract->tenant_id) {
            return false;
        }

        // Öğrenci kendi sözleşmesini görebilir
        if ($contract->student_id && $user->id === $contract->student_id) {
            return true;
        }

        // Yöneticiler ve muhasebe görebilir
        return $user->hasPermission('academic.read') || $user->hasPermission('finance.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->hasPermission('finance.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Contract $contract): bool
    {
        if ($user->tenant_id !== $contract->tenant_id) {
            return false;
        }

        // Sadece draft durumundaki sözleşmeler güncellenebilir
        if ($contract->status !== 'draft') {
            return false;
        }

        return $user->hasPermission('academic.update') || $user->hasPermission('finance.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Contract $contract): bool
    {
        if ($user->tenant_id !== $contract->tenant_id) {
            return false;
        }

        // Sadece draft durumundaki sözleşmeler silinebilir
        if ($contract->status !== 'draft') {
            return false;
        }

        return $user->hasPermission('academic.delete') || $user->hasPermission('finance.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Contract $contract): bool
    {
        return $this->delete($user, $contract);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Contract $contract): bool
    {
        return $this->delete($user, $contract);
    }
}
