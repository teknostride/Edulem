<?php

namespace App\Policies;

use App\Models\Expense;
use App\Models\User;

class ExpensePolicy
{
    /**
     * Determine if the user can view any expenses.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('financial.read');
    }

    /**
     * Determine if the user can view the expense.
     */
    public function view(User $user, Expense $expense): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $expense->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('financial.read')) {
            return false;
        }

        return true;
    }

    /**
     * Determine if the user can create expenses.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('financial.create');
    }

    /**
     * Determine if the user can update the expense.
     */
    public function update(User $user, Expense $expense): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $expense->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.update');
    }

    /**
     * Determine if the user can delete the expense.
     */
    public function delete(User $user, Expense $expense): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $expense->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.delete');
    }
}
