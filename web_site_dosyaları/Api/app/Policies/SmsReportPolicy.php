<?php

namespace App\Policies;

use App\Models\SmsReport;
use App\Models\User;

class SmsReportPolicy
{
    /**
     * SuperAdmin bypass
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->is_superadmin) {
            return true;
        }
        return null;
    }

    /**
     * Check if user is staff or manager
     */
    protected function isStaff(User $user): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        $roleName = $user->role?->name;
        $allowedRoles = [
            'owner',
            'Genel Müdür',
            'Kampüs Müdürü',
            'Müdür',
            'Müdür Yardımcısı',
            'Admin',
            'Rehberlik',
            'Öğrenci İşleri',
        ];

        return in_array((int) $user->role_id, [1, 2, 3, 4, 5, 6, 11], true)
            || in_array($roleName, $allowedRoles, true);
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->isStaff($user) || $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, SmsReport $smsReport): bool
    {
        if ($user->tenant_id !== $smsReport->tenant_id && !$user->is_superadmin) {
            return false;
        }
        return $this->isStaff($user) || $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // SMS raporları otomatik oluşturulur, manuel oluşturma yok
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SmsReport $smsReport): bool
    {
        // SMS raporları güncellenemez
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SmsReport $smsReport): bool
    {
        if ($user->tenant_id !== $smsReport->tenant_id && !$user->is_superadmin) {
            return false;
        }
        return $this->isStaff($user) || $user->hasPermission('communication.delete');
    }
}

