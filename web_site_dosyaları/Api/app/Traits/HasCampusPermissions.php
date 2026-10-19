<?php

namespace App\Traits;

use App\Models\UserCampusPermission;

trait HasCampusPermissions
{
    /**
     * Check if user has permission for a specific campus.
     *
     * @param  int  $campusId
     * @param  string  $permissionName
     * @param  string  $action  (read, create, update, delete)
     * @return bool
     */
    public function hasCampusPermission(int $campusId, string $permissionName, string $action = 'read'): bool
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

        // Check campus permission
        $campusPermission = UserCampusPermission::where('user_id', $this->id)
            ->where('campus_id', $campusId)
            ->where('permission_id', $permission->id)
            ->first();

        if (!$campusPermission) {
            return false;
        }

        // Check action
        $actionField = 'can_' . $action;
        return $campusPermission->$actionField ?? false;
    }

    /**
     * Get all campus permissions for user.
     *
     * @param  int  $campusId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getCampusPermissions(int $campusId)
    {
        return UserCampusPermission::where('user_id', $this->id)
            ->where('campus_id', $campusId)
            ->with('permission')
            ->get();
    }
}
