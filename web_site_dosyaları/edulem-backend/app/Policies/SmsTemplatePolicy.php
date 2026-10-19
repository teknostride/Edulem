<?php

namespace App\Policies;

use App\Models\SmsTemplate;
use App\Models\User;

class SmsTemplatePolicy
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
    public function view(User $user, SmsTemplate $smsTemplate): bool
    {
        if ($user->tenant_id !== $smsTemplate->tenant_id) {
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
    public function update(User $user, SmsTemplate $smsTemplate): bool
    {
        if ($user->tenant_id !== $smsTemplate->tenant_id) {
            return false;
        }

        // System şablonları sadece SuperAdmin güncelleyebilir
        if ($smsTemplate->type === 'system' && !$user->is_superadmin) {
            return false;
        }

        return $isStaff || $user->hasPermission('communication.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SmsTemplate $smsTemplate): bool
    {
        if ($user->tenant_id !== $smsTemplate->tenant_id) {
            return false;
        }

        // System şablonları silinemez
        if ($smsTemplate->type === 'system') {
            return false;
        }
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Admin', 'Rehberlik', 'Öğrenci İşleri']);
        return $isStaff || $user->hasPermission('communication.delete');
    }
}
