<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    /**
     * Determine if the user can view any payments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('financial.read');
    }

    /**
     * Determine if the user can view the payment.
     */
    public function view(User $user, Payment $payment): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $payment->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('financial.read')) {
            return false;
        }

        // Row-Level Security: Öğretmen sadece kendi öğrencilerinin ödemelerini görebilir
        if ($user->role && $user->role->name === 'teacher') {
            // İleride classroom_students pivot tablosu eklendiğinde kontrol edilecek
            // return $payment->student->classrooms->where('teacher_id', $user->id)->isNotEmpty();
            return true; // Şimdilik tüm ödemeleri görebilir
        }

        return true;
    }

    /**
     * Determine if the user can create payments.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('financial.create');
    }

    /**
     * Determine if the user can update the payment.
     */
    public function update(User $user, Payment $payment): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $payment->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.update');
    }

    /**
     * Determine if the user can delete the payment.
     */
    public function delete(User $user, Payment $payment): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $payment->tenant_id) {
            return false;
        }

        return $user->hasPermission('financial.delete');
    }
}
