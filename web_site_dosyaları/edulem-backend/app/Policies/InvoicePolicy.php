<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    /**
     * Determine if the user can view any invoices.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('financial.read');
    }

    /**
     * Determine if the user can view the invoice.
     */
    public function view(User $user, Invoice $invoice): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $invoice->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('financial.read')) {
            return false;
        }

        // Row-Level Security: Öğretmen sadece kendi öğrencilerinin faturalarını görebilir
        if ($user->role && $user->role->name === 'teacher') {
            // İleride classroom_students pivot tablosu eklendiğinde kontrol edilecek
            return true; // Şimdilik tüm faturaları görebilir
        }

        return true;
    }

    /**
     * Determine if the user can create invoices.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('financial.create');
    }

    /**
     * Determine if the user can update the invoice.
     */
    public function update(User $user, Invoice $invoice): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $invoice->tenant_id) {
            return false;
        }

        // Ödenmiş faturalar güncellenemez
        if ($invoice->status === 'paid') {
            return false;
        }

        return $user->hasPermission('financial.update');
    }

    /**
     * Determine if the user can delete the invoice.
     */
    public function delete(User $user, Invoice $invoice): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $invoice->tenant_id) {
            return false;
        }

        // Ödenmiş faturalar silinemez
        if ($invoice->status === 'paid') {
            return false;
        }

        return $user->hasPermission('financial.delete');
    }
}
