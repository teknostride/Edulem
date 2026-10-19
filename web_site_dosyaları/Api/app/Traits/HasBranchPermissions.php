<?php

namespace App\Traits;

use App\Models\UserBranchPermission;

trait HasBranchPermissions
{
    /**
     * Check if user has permission for a specific branch.
     *
     * @param  int  $branchId
     * @param  string  $permissionName
     * @param  string  $action  (read, create, update, delete)
     * @return bool
     */
    public function hasBranchPermission(int $branchId, string $permissionName, string $action = 'read'): bool
    {
        // SuperAdmin has all permissions
        if ($this->is_superadmin) {
            return true;
        }

        // Get permission ID
        $permission = \App\Models\Permission::where('name', $permissionName)->first();
        if (!$permission) {
            return false;
        }

        // Check branch permission
        $branchPermission = UserBranchPermission::where('user_id', $this->id)
            ->where('branch_id', $branchId)
            ->where('permission_id', $permission->id)
            ->first();

        if (!$branchPermission) {
            return false;
        }

        // Check action
        $actionField = 'can_' . $action;
        return $branchPermission->$actionField ?? false;
    }

    /**
     * Get all branch permissions for user.
     *
     * @param  int  $branchId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getBranchPermissions(int $branchId)
    {
        return UserBranchPermission::where('user_id', $this->id)
            ->where('branch_id', $branchId)
            ->with('permission')
            ->get();
    }
}
