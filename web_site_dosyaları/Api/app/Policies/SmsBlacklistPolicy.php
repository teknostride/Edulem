<?php

namespace App\Policies;

use App\Models\SmsBlacklist;
use App\Models\User;

class SmsBlacklistPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, SmsBlacklist $smsBlacklist): bool
    {
        if ($user->tenant_id !== $smsBlacklist->tenant_id) {
            return false;
        }
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SmsBlacklist $smsBlacklist): bool
    {
        if ($user->tenant_id !== $smsBlacklist->tenant_id) {
            return false;
        }
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SmsBlacklist $smsBlacklist): bool
    {
        if ($user->tenant_id !== $smsBlacklist->tenant_id) {
            return false;
        }
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.delete');
    }
}
