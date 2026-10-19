<?php

namespace App\Policies;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttendancePolicy
{
    private array $teacherOnlyRoles = ['öğretmen', 'sınıf öğretmeni', 'rehberlik', 'teacher', 'class_teacher', 'guidance'];
    private array $teacherOnlyRoleIds = [5, 6];
    private array $managementTrackingRoles = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'];
    private array $managementTrackingRoleIds = [1, 2, 3, 4, 7, 10];

    private function isTeacherOnly(User $user): bool
    {
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->teacherOnlyRoleIds, true)) {
            return true;
        }

        $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : null;

        return (bool) ($roleName && in_array($roleName, $this->teacherOnlyRoles, true));
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        $roleName = $user->role ? $user->role->name : null;
        $isTeacherOnly = $this->isTeacherOnly($user);

        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->managementTrackingRoleIds, true)) {
            return true;
        }

        if ($roleName && in_array($roleName, $this->managementTrackingRoles, true)) {
            return true;
        }

        return $user->hasPermission('academic.read') || $isTeacherOnly;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Attendance $attendance): bool
    {
        if ($user->tenant_id !== $attendance->tenant_id) {
            return false;
        }

        if ($user->hasPermission('academic.read')) {
            return true;
        }

        $isTeacherOnly = $this->isTeacherOnly($user);
        if (!$isTeacherOnly) {
            return false;
        }

        $attendance->loadMissing('schedule');
        $schedule = $attendance->schedule;
        if (!$schedule) {
            return false;
        }
        // Ana öğretmen mi?
        if ((int) ($schedule->teacher_id ?? 0) === (int) $user->id) {
            return true;
        }
        // Yardımcı öğretmen mi? (assistant_teacher_ids JSON array)
        $assistants = $schedule->assistant_teacher_ids ?? [];
        if (is_string($assistants)) {
            $assistants = json_decode($assistants, true) ?? [];
        }
        return in_array((int) $user->id, array_map('intval', (array) $assistants), true);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        $isTeacherOnly = $this->isTeacherOnly($user);

        if ($isTeacherOnly) {
            return true;
        }

        return $user->hasPermission('academic.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Attendance $attendance): bool
    {
        if ($user->tenant_id !== $attendance->tenant_id) {
            return false;
        }

        if ($user->hasPermission('academic.update')) {
            return true;
        }

        if ($this->isTeacherOnly($user)) {
            $attendance->loadMissing('schedule');
            $schedule = $attendance->schedule;
            if (!$schedule) {
                return false;
            }
            if ((int) ($schedule->teacher_id ?? 0) === (int) $user->id) {
                return true;
            }
            $assistants = $schedule->assistant_teacher_ids ?? [];
            if (is_string($assistants)) {
                $assistants = json_decode($assistants, true) ?? [];
            }
            return in_array((int) $user->id, array_map('intval', (array) $assistants), true);
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Attendance $attendance): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $attendance->tenant_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Attendance $attendance): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $attendance->tenant_id;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Attendance $attendance): bool
    {
        return $user->hasPermission('academic.delete') && $user->tenant_id === $attendance->tenant_id;
    }
}
