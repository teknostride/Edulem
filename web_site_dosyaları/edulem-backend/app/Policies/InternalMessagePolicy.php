<?php

namespace App\Policies;

use App\Models\InternalMessage;
use App\Models\User;

class InternalMessagePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Herkes mesajları görebilir
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, InternalMessage $message): bool
    {
        if ($user->tenant_id !== $message->tenant_id) {
            return false;
        }

        // Gönderen veya alıcı mesajı görebilir
        if ($message->sender_id === $user->id) {
            return true;
        }

        // Alıcı kontrolü
        return $message->recipients()
            ->where('recipient_id', $user->id)
            ->exists();
    }

    /**
     * Determine whether the user can create models.
     * Kurucu ve kurum sahibi mesaj gönderebilir, diğerleri permission kontrolüne tabi.
     */
    public function create(User $user): bool
    {
        // SuperAdmin mesaj gönderebilir
        if ($user->is_superadmin) {
            return true;
        }
        
        // Kurucu (owner) ve Genel Müdür (general_manager) mesaj gönderebilir
        $roleName = $user->role?->name ?? '';
        if (in_array($roleName, ['owner', 'general_manager'])) {
            return true;
        }
        
        // Diğerleri permission kontrolüne tabi
        return $user->hasPermission('messages.create') || $user->hasPermission('communication.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, InternalMessage $message): bool
    {
        // Sadece gönderen güncelleyebilir
        return $user->tenant_id === $message->tenant_id 
            && $message->sender_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, InternalMessage $message): bool
    {
        // Gönderen veya yönetici silebilir
        if ($user->tenant_id !== $message->tenant_id) {
            return false;
        }

        if ($message->sender_id === $user->id) {
            return true;
        }

        return $user->hasPermission('communication.delete');
    }
}
