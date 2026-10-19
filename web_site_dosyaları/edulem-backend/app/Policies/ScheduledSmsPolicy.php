<?php

namespace App\Policies;

use App\Models\ScheduledSms;
use App\Models\User;

class ScheduledSmsPolicy
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
            'Öğretmen',
            'Sınıf Öğretmeni',
            'teacher',
            'ogretmen',
        ];

        return in_array((int) $user->role_id, [1, 2, 3, 4, 5, 6, 11], true)
            || in_array($roleName, $allowedRoles, true)
            || str_contains(mb_strtolower((string)$roleName, 'UTF-8'), 'öğretmen')
            || str_contains(mb_strtolower((string)$roleName, 'UTF-8'), 'teacher');
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
    public function view(User $user, ScheduledSms $scheduledSms): bool
    {
        if ($user->tenant_id !== $scheduledSms->tenant_id && !$user->is_superadmin) {
            return false;
        }
        return $this->isStaff($user) || $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->isStaff($user) || $user->hasPermission('communication.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ScheduledSms $scheduledSms): bool
    {
        if ($user->tenant_id !== $scheduledSms->tenant_id && !$user->is_superadmin) {
            return false;
        }

        // Sadece pending durumundaki SMS'ler güncellenebilir
        if ($scheduledSms->status !== 'pending') {
            return false;
        }

        return $this->isStaff($user) || $user->hasPermission('communication.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ScheduledSms $scheduledSms): bool
    {
        if ($user->tenant_id !== $scheduledSms->tenant_id && !$user->is_superadmin) {
            return false;
        }

        return $this->isStaff($user) || $user->hasPermission('communication.delete');
    }

    /**
     * Determine whether the user can cancel the scheduled SMS.
     */
    public function cancel(User $user, ScheduledSms $scheduledSms): bool
    {
        return $this->update($user, $scheduledSms);
    }
}
