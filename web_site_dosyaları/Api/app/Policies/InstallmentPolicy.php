<?php

namespace App\Policies;

use App\Models\Installment;
use App\Models\User;

class InstallmentPolicy
{
    /**
     * Determine if the user can view any installments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('financial.read');
    }

    /**
     * Determine if the user can view the installment.
     */
    public function view(User $user, Installment $installment): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $installment->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('financial.read')) {
            return false;
        }

        // Row-Level Security: Öğretmen sadece kendi öğrencilerinin taksitlerini görebilir
        if ($user->role && $user->role->name === 'teacher') {
            // İleride classroom_students pivot tablosu eklendiğinde kontrol edilecek
            return true; // Şimdilik tüm taksitleri görebilir
        }

        return true;
    }

    /**
     * Determine if the user can create installments.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('financial.create');
    }

    /**
     * Determine if the user can update the installment.
     */
    public function update(User $user, Installment $installment): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $installment->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.update');
    }

    /**
     * Determine if the user can delete the installment.
     */
    public function delete(User $user, Installment $installment): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $installment->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.delete');
    }
}
