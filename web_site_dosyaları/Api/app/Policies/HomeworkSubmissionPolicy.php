<?php

namespace App\Policies;

use App\Models\HomeworkSubmission;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class HomeworkSubmissionPolicy
{
    private function isStudentAffairs(User $user): bool
    {
        $roleName = $user->role ? $user->role->name : null;
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, HomeworkSubmission $submission): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        return $user->hasPermission('academic.read') && $user->tenant_id === $submission->tenant_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        // Sadece öğrenci ödev gönderebilir
        return $user->hasPermission('academic.create') && $user->student !== null;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, HomeworkSubmission $submission): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        // Öğretmen değerlendirme yapabilir
        return $user->hasPermission('academic.update') && $user->tenant_id === $submission->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, HomeworkSubmission $submission): bool
    {
        if ($this->isStudentAffairs($user)) {
            return false;
        }

        return $user->hasPermission('academic.delete') && $user->tenant_id === $submission->tenant_id;
    }
}
