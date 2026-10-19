<?php

namespace App\Policies;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SettingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Herkes kendi tenant'ının ayarlarını görebilir
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Setting $setting): bool
    {
        // Sadece kendi tenant'ının ayarlarını görebilir
        if ($user->tenant_id !== $setting->tenant_id) {
            return false;
        }

        // Public ayarlar herkes tarafından görülebilir
        if ($setting->is_public) {
            return true;
        }

        // Yöneticiler tüm ayarları görebilir
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Sadece yöneticiler ayar oluşturabilir
        return $user->hasPermission('academic.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Setting $setting): bool
    {
        if ($user->tenant_id !== $setting->tenant_id) {
            return false;
        }

        // Yöneticiler ayarları güncelleyebilir
        return $user->hasPermission('academic.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Setting $setting): bool
    {
        if ($user->tenant_id !== $setting->tenant_id) {
            return false;
        }

        // Sadece yöneticiler ayar silebilir
        return $user->hasPermission('academic.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Setting $setting): bool
    {
        return $this->delete($user, $setting);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Setting $setting): bool
    {
        return $this->delete($user, $setting);
    }
}
