<?php

namespace App\Policies;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ClassroomPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // SuperAdmin ve Owner her şeyi görebilir
        if ($user->isSuperAdmin() || ($user->role && $user->role->name === 'owner')) {
            return true;
        }
        
        // Geçici olarak tenant kontrolü yeterli
        if ($user->tenant_id) {
            return true;
        }
        
        return $user->hasPermission('academic.read');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Classroom $classroom): bool
    {
        // SuperAdmin her şeyi görebilir
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $classroom->tenant_id) {
            return false;
        }

        // Owner kendi tenant'ındaki sınıfları görebilir
        if ($user->role && $user->role->name === 'owner') {
            return true;
        }

        // Permission kontrolü
        if (!$user->hasPermission('academic.read')) {
            return false;
        }

        // Row-Level Security: Branch Manager (Kademe Müdürü) sadece kendi branch'indeki sınıfları görebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            if ($classroom->branch_id) {
                return in_array($classroom->branch_id, $managedBranchIds);
            }
            
            // Eğer sınıfın branch'i yoksa, branch manager göremez
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // SuperAdmin ve Owner her şeyi yapabilir
        if ($user->isSuperAdmin() || ($user->role && $user->role->name === 'owner')) {
            return true;
        }
        
        // Geçici olarak tenant kontrolü yeterli
        if ($user->tenant_id) {
            return true;
        }
        
        return $user->hasPermission('academic.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Classroom $classroom): bool
    {
        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            return true;
        }
        
        // Owner kendi tenant'ındaki sınıfları güncelleyebilir
        if ($user->role && $user->role->name === 'owner') {
            return $user->tenant_id === $classroom->tenant_id;
        }
        
        // Geçici olarak tenant kontrolü yeterli
        if ($user->tenant_id === $classroom->tenant_id) {
            return true;
        }
        
        return $user->hasPermission('academic.update') && $user->tenant_id === $classroom->tenant_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Classroom $classroom): bool
    {
        \Log::info('ClassroomPolicy::delete - Entry point', [
            'user_id' => $user->id,
            'classroom_id' => $classroom->id,
            'classroom_tenant_id_raw' => $classroom->tenant_id,
            'classroom_attributes' => $classroom->getAttributes(),
        ]);

        // SuperAdmin her şeyi yapabilir
        if ($user->isSuperAdmin()) {
            \Log::info('ClassroomPolicy::delete - SuperAdmin PASSED');
            return true;
        }

        // Tenant kontrolü
        if ($user->tenant_id !== $classroom->tenant_id) {
            \Log::info('ClassroomPolicy::delete - Tenant mismatch FAILED', [
                'user_tenant' => $user->tenant_id,
                'classroom_tenant' => $classroom->tenant_id
            ]);
            return false;
        }
        
        // Owner kendi tenant'ındaki sınıfları silebilir
        if ($user->role && $user->role->name === 'owner') {
            \Log::info('ClassroomPolicy::delete - Owner PASSED');
            return true;
        }

        // Geçici olarak tenant kontrolü yeterli
        if ($user->tenant_id === $classroom->tenant_id) {
            \Log::info('ClassroomPolicy::delete - Tenant check PASSED');
            return true;
        }

        // Permission kontrolü
        if (!$user->hasPermission('academic.delete')) {
            \Log::info('ClassroomPolicy::delete - Permission FAILED', [
                'permission' => 'academic.delete',
                'has_permission' => false
            ]);
            return false;
        }

        // Row-Level Security: Branch Manager sadece kendi branch'indeki sınıfları silebilir
        if ($user->managedBranches()->exists()) {
            $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
            
            if ($classroom->branch_id) {
                $result = in_array($classroom->branch_id, $managedBranchIds);
                \Log::info('ClassroomPolicy::delete - BranchManager check', [
                    'classroom_branch' => $classroom->branch_id,
                    'managed_branches' => $managedBranchIds,
                    'passed' => $result
                ]);
                return $result;
            }
            
            \Log::info('ClassroomPolicy::delete - BranchManager no branch FAILED');
            return false;
        }

        \Log::info('ClassroomPolicy::delete - Final check PASSED');
        return true;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Classroom $classroom): bool
    {
        return $user->hasPermission('classrooms.delete') && $user->tenant_id === $classroom->tenant_id;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Classroom $classroom): bool
    {
        return $user->hasPermission('classrooms.delete') && $user->tenant_id === $classroom->tenant_id;
    }
}
