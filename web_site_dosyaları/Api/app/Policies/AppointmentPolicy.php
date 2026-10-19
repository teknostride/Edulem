<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AppointmentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // CRM modülü için permission kontrolü
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->tenant_id !== $appointment->tenant_id) {
            return false;
        }

        // Atanan kullanıcı veya yöneticiler görebilir
        if ($appointment->assigned_to === $user->id) {
            return true;
        }

        // Yöneticiler tüm randevuları görebilir
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Herkes randevu oluşturabilir (CRM için)
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Appointment $appointment): bool
    {
        if ($user->tenant_id !== $appointment->tenant_id) {
            return false;
        }

        // Atanan kullanıcı veya yöneticiler güncelleyebilir
        if ($appointment->assigned_to === $user->id) {
            return true;
        }

        // Yöneticiler güncelleyebilir
        return $user->hasPermission('academic.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Appointment $appointment): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $appointment->tenant_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Appointment $appointment): bool
    {
        return $this->delete($user, $appointment);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Appointment $appointment): bool
    {
        return $this->delete($user, $appointment);
    }
}
