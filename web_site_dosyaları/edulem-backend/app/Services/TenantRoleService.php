<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Support\Facades\Schema;

class TenantRoleService
{
    /**
     * Seed standard school roles and permissions for a given tenant.
     */
    public static function seedRolesForTenant(Tenant $tenant): array
    {
        $createdRoles = [];

        // 1. Kurum Sahibi (Owner)
        $owner = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'owner'],
            [
                'display_name' => 'Kurum Sahibi',
                'description'  => 'Kurumun sahibi ve ana yöneticisi',
                'is_system'    => true,
                'level'        => 0,
                'sort_order'   => 0,
            ]
        );
        $createdRoles['owner'] = $owner;

        // 2. Müdür
        $manager = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Müdür'],
            [
                'parent_id'    => $owner->id,
                'display_name' => 'Müdür',
                'description'  => 'Okul Müdürü - Kurum ve kademe yönetimi',
                'is_system'    => true,
                'level'        => 3,
                'sort_order'   => 1,
            ]
        );
        $createdRoles['manager'] = $manager;

        // 3. Müdür Yardımcısı
        $assistantManager = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Müdür Yardımcısı'],
            [
                'parent_id'    => $manager->id,
                'display_name' => 'Müdür Yardımcısı',
                'description'  => 'Müdür Yardımcısı - İdari ve akademik işler',
                'is_system'    => true,
                'level'        => 3,
                'sort_order'   => 2,
            ]
        );
        $createdRoles['assistant_manager'] = $assistantManager;

        // 4. Öğretmen
        $teacher = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Öğretmen'],
            [
                'parent_id'    => $manager->id,
                'display_name' => 'Öğretmen',
                'description'  => 'Branş ve ders öğretmeni',
                'is_system'    => true,
                'level'        => 4,
                'sort_order'   => 3,
            ]
        );
        $createdRoles['teacher'] = $teacher;

        // 5. Rehberlik
        $guidance = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Rehberlik'],
            [
                'parent_id'    => $manager->id,
                'display_name' => 'Rehberlik',
                'description'  => 'Rehberlik ve Psikolojik Danışmanlık Servisi',
                'is_system'    => true,
                'level'        => 4,
                'sort_order'   => 4,
            ]
        );
        $createdRoles['guidance'] = $guidance;

        // 6. Öğrenci İşleri
        $studentAffairs = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Öğrenci İşleri'],
            [
                'parent_id'    => $manager->id,
                'display_name' => 'Öğrenci İşleri',
                'description'  => 'Öğrenci kayıt, devam ve resmi işler',
                'is_system'    => true,
                'level'        => 4,
                'sort_order'   => 5,
            ]
        );
        $createdRoles['student_affairs'] = $studentAffairs;

        // 7. Muhasebe
        $accounting = Role::firstOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Muhasebe'],
            [
                'parent_id'    => $manager->id,
                'display_name' => 'Muhasebe',
                'description'  => 'Mali işler ve ödeme takibi',
                'is_system'    => true,
                'level'        => 4,
                'sort_order'   => 6,
            ]
        );
        $createdRoles['accounting'] = $accounting;

        // İzinleri güvenli şekilde ata (permission_role tablosu varsa)
        try {
            if (Schema::hasTable('permissions') && Schema::hasTable('permission_role')) {
                self::assignPermissions($owner, 'all');
                self::assignPermissions($manager, [
                    'branches', 'education_levels', 'students', 'schedules', 'attendances',
                    'homeworks', 'tutoring', 'grades', 'guidance_notes', 'reports', 'users',
                    'form_surveys', 'online_surveys',
                ]);
                self::assignPermissions($assistantManager, [
                    'branches', 'education_levels', 'students', 'schedules', 'attendances',
                    'homeworks', 'tutoring', 'grades', 'guidance_notes', 'reports', 'users',
                    'form_surveys', 'online_surveys',
                ]);
                self::assignPermissions($teacher, [
                    'attendances.create', 'attendances.update', 'homeworks.create',
                    'homeworks.update', 'grades.create', 'grades.update', 'questions.read',
                    'questions.create', 'students.read',
                ]);
                self::assignPermissions($guidance, [
                    'guidance_notes', 'question_targets', 'students.read', 'students.update',
                    'reports.read',
                ]);
                self::assignPermissions($studentAffairs, [
                    'branches', 'students', 'schedules', 'attendances',
                    'tutoring', 'grades', 'reports', 'users',
                ]);
                self::assignPermissions($accounting, [
                    'financial.read', 'financial.create', 'financial.update',
                    'students.read', 'reports.read',
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('Role permissions could not be assigned: ' . $e->getMessage());
        }

        return $createdRoles;
    }

    /**
     * Assign permissions helper.
     */
    protected static function assignPermissions(Role $role, string|array $modules): void
    {
        if ($modules === 'all') {
            $permissions = Permission::all();
        } else {
            $permissionNames = [];
            foreach ($modules as $module) {
                if (str_contains($module, '.')) {
                    $permissionNames[] = $module;
                } else {
                    $permissionNames[] = "{$module}.create";
                    $permissionNames[] = "{$module}.read";
                    $permissionNames[] = "{$module}.update";
                    $permissionNames[] = "{$module}.delete";
                    $permissionNames[] = "{$module}.export";
                }
            }
            $permissions = Permission::whereIn('name', $permissionNames)->get();
        }

        if ($permissions->isNotEmpty()) {
            $role->permissions()->sync($permissions->pluck('id'));
        }
    }
}
