<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class LeadPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // CRM modülü için permission kontrolü (eğer varsa)
        // Şimdilik tüm yetkili kullanıcılar görebilir
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        // Atanan kullanıcı veya yöneticiler görebilir
        if ($lead->assigned_to === $user->id) {
            return true;
        }

        // Yöneticiler tüm lead'leri görebilir
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Herkes lead oluşturabilir (CRM için)
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        // Atanan kullanıcı veya yöneticiler güncelleyebilir
        if ($lead->assigned_to === $user->id) {
            return true;
        }

        // Yöneticiler güncelleyebilir
        return $user->hasPermission('academic.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Lead $lead): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $lead->tenant_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Lead $lead): bool
    {
        return $this->delete($user, $lead);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Lead $lead): bool
    {
        return $this->delete($user, $lead);
    }
}
