<?php

namespace App\Policies;

use App\Models\MealMenu;
use App\Models\User;

class MealMenuPolicy
{
    private array $managementRoles = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'];
    private array $managementRoleIds = [1, 2, 3, 4, 7, 10];

    private function isManagement(User $user): bool
    {
        if (!empty($user->role_id) && in_array((int) $user->role_id, $this->managementRoleIds, true)) {
            return true;
        }
        $roleName = $user->role ? $user->role->name : null;
        return (bool) ($roleName && in_array($roleName, $this->managementRoles, true));
    }

    public function viewAny(mixed $user): bool
    {
        if (!$user) {
            return false;
        }

        // Menü listesi kurum içi bir ekrandır; tenant kullanıcısı (User, Student, Guardian) olan herkes listeyi görebilsin.
        if (!empty($user->tenant_id)) {
            return true;
        }

        if ($user instanceof User) {
            if ($this->isManagement($user)) {
                return true;
            }

            return $user->hasPermission('academic.read') || $user->is_superadmin;
        }

        return false;
    }

    /**
     * Determine if the user can view the meal menu.
     */
    public function view(mixed $user, MealMenu $mealMenu): bool
    {
        if (!$user) {
            return false;
        }

        if ($user instanceof User && $user->is_superadmin) {
            return true;
        }

        if ($user instanceof User && $this->isManagement($user)) {
            return (int) $user->tenant_id === (int) $mealMenu->tenant_id;
        }

        if (!empty($user->tenant_id) && (int) $user->tenant_id === (int) $mealMenu->tenant_id) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can create meal menus.
     */
    public function create(mixed $user): bool
    {
        if (!$user) {
            return false;
        }
        if ($user instanceof User) {
            if ($user->is_superadmin || $this->isManagement($user)) {
                return true;
            }
            return $user->hasPermission('academic.create');
        }
        return false;
    }

    /**
     * Determine if the user can update the meal menu.
     */
    public function update(mixed $user, MealMenu $mealMenu): bool
    {
        if (!$user) {
            return false;
        }

        if ($user instanceof User && $user->is_superadmin) {
            return true;
        }

        if ($user instanceof User && $this->isManagement($user)) {
            return (int) $user->tenant_id === (int) $mealMenu->tenant_id;
        }

        if ($user instanceof User && (int) $user->tenant_id === (int) $mealMenu->tenant_id) {
            return $user->hasPermission('academic.update');
        }

        return false;
    }

    /**
     * Determine if the user can delete the meal menu.
     */
    public function delete(mixed $user, MealMenu $mealMenu): bool
    {
        if (!$user) {
            return false;
        }

        if ($user instanceof User && $user->is_superadmin) {
            return true;
        }

        if ($user instanceof User && $this->isManagement($user)) {
            return (int) $user->tenant_id === (int) $mealMenu->tenant_id;
        }

        if ($user instanceof User && (int) $user->tenant_id === (int) $mealMenu->tenant_id) {
            return $user->hasPermission('academic.delete');
        }

        return false;
    }
}
