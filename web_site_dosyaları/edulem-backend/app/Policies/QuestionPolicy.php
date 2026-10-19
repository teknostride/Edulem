<?php

namespace App\Policies;

use App\Models\Question;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class QuestionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Herkes soruları görebilir (öğrenci, veli, öğretmen, yönetici)
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Question $question): bool
    {
        // Öğrenci veya veli kendi sorularını görebilir
        if ($user->tenant_id === $question->tenant_id) {
            // SuperAdmin veya yöneticiler tüm soruları görebilir
            if ($user->isSuperAdmin() || $user->hasPermission('academic.read')) {
                return true;
            }
            // Öğrenci kendi sorularını görebilir
            if ($question->student_id && $user->id === $question->student_id) {
                return true;
            }
            // Veli kendi sorularını görebilir (guardian_id kontrolü gerekli)
            // Not: Guardian modeli User değil, bu yüzden bu kontrol şimdilik basit
        }
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Herkes soru sorabilir (öğrenci, veli, öğretmen)
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Question $question): bool
    {
        if ($user->tenant_id !== $question->tenant_id) {
            return false;
        }

        // Yöneticiler ve atanan kullanıcı güncelleyebilir
        if ($user->hasPermission('academic.update')) {
            return true;
        }

        // Atanan kullanıcı güncelleyebilir
        if ($question->assigned_to === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Question $question): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $question->tenant_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Question $question): bool
    {
        return $this->delete($user, $question);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Question $question): bool
    {
        return $this->delete($user, $question);
    }
}
