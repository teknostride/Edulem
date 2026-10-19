<?php

namespace App\Policies;

use App\Models\QuestionBank;
use App\Models\User;

class QuestionBankPolicy
{
    /**
     * Determine if the user can view any question bank entries.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the question bank entry.
     */
    public function view(User $user, QuestionBank $questionBank): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBank->tenant_id) {
            return false;
        }

        // Herkese açık sorular veya yetkili kullanıcılar görebilir
        if ($questionBank->is_public || $user->hasPermission('academic.read')) {
            return true;
        }

        // Oluşturan görebilir
        return $questionBank->created_by === $user->id;
    }

    /**
     * Determine if the user can create question bank entries.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the question bank entry.
     */
    public function update(User $user, QuestionBank $questionBank): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBank->tenant_id) {
            return false;
        }

        // Oluşturan veya yetkili kullanıcılar güncelleyebilir
        if ($questionBank->created_by === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.update');
    }

    /**
     * Determine if the user can delete the question bank entry.
     */
    public function delete(User $user, QuestionBank $questionBank): bool
    {
        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $questionBank->tenant_id) {
            return false;
        }

        // Oluşturan veya yetkili kullanıcılar silebilir
        if ($questionBank->created_by === $user->id) {
            return true;
        }

        return $user->hasPermission('academic.delete');
    }
}
