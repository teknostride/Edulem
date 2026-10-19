<?php

namespace App\Policies;

use App\Models\GuidanceNote;
use App\Models\User;

class GuidanceNotePolicy
{
    private function isStudentAffairs(User $user): bool
    {
        $roleName = $user->role ? $user->role->name : null;
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    /**
     * Determine if the user can view any guidance notes.
     */
    public function viewAny(User $user): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        return $user->hasPermission('academic.read') || $user->is_superadmin;
    }

    /**
     * Determine if the user can view the guidance note.
     */
    public function view(User $user, GuidanceNote $guidanceNote): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $guidanceNote->tenant_id) {
            return false;
        }

        // Gizli notlar sadece rehber ve idare görebilir
        if ($guidanceNote->is_confidential) {
            return $user->hasPermission('academic.read') && 
                   ($user->id === $guidanceNote->counselor_id || $user->hasPermission('admin'));
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can create guidance notes.
     */
    public function create(User $user): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        return $user->hasPermission('academic.create') || $user->is_superadmin;
    }

    /**
     * Determine if the user can update the guidance note.
     */
    public function update(User $user, GuidanceNote $guidanceNote): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $guidanceNote->tenant_id) {
            return false;
        }

        // Sadece rehber kendi notunu güncelleyebilir (idare hariç)
        if ($user->id === $guidanceNote->counselor_id) {
            return $user->hasPermission('academic.update');
        }

        // İdare onaylama yapabilir
        if ($guidanceNote->requires_admin_review && $user->hasPermission('admin')) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can delete the guidance note.
     */
    public function delete(User $user, GuidanceNote $guidanceNote): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        if ($user->is_superadmin) {
            return true;
        }

        if ($user->tenant_id !== $guidanceNote->tenant_id) {
            return false;
        }

        // Sadece rehber kendi notunu silebilir (idare hariç)
        if ($user->id === $guidanceNote->counselor_id) {
            return $user->hasPermission('academic.delete');
        }

        // İdare silebilir
        return $user->hasPermission('admin');
    }
}
