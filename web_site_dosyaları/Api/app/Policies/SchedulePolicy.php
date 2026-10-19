<?php

namespace App\Policies;

use App\Models\Schedule;
use App\Models\User;

class SchedulePolicy
{
    /**
     * Determine if the user can view any schedules.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine if the user can view the schedule.
     */
    public function view(User $user, Schedule $schedule): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $schedule->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('academic.read')) {
            return false;
        }

        // Row-Level Security: Öğretmen sadece kendi derslerini görebilir
        if ($user->role && $user->role->name === 'teacher') {
            return $schedule->teacher_id === $user->id;
        }

        // Row-Level Security: Branch Manager (Kademe Müdürü) sadece kendi branch'indeki ders programlarını görebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            // Schedule'ın classroom'ı ve branch'i kontrol et
            if ($schedule->classroom && $schedule->classroom->branch_id) {
                return in_array($schedule->classroom->branch_id, $managedBranchIds);
            }
            
            // Eğer schedule'ın classroom'ı yoksa, branch manager göremez
            return false;
        }

        return true;
    }

    /**
     * Determine if the user can create schedules.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('academic.create');
    }

    /**
     * Determine if the user can update the schedule.
     */
    public function update(User $user, Schedule $schedule): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $schedule->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('academic.update')) {
            return false;
        }

        // Row-Level Security: Branch Manager sadece kendi branch'indeki ders programlarını güncelleyebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            if ($schedule->classroom && $schedule->classroom->branch_id) {
                return in_array($schedule->classroom->branch_id, $managedBranchIds);
            }
            
            return false;
        }

        return true;
    }

    /**
     * Determine if the user can delete the schedule.
     */
    public function delete(User $user, Schedule $schedule): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $schedule->tenant_id) {
            return false;
        }

        // Permission kontrolü
        if (!$user->hasPermission('academic.delete')) {
            return false;
        }

        // Row-Level Security: Branch Manager sadece kendi branch'indeki ders programlarını silebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            if ($schedule->classroom && $schedule->classroom->branch_id) {
                return in_array($schedule->classroom->branch_id, $managedBranchIds);
            }
            
            return false;
        }

        return true;
    }
}
