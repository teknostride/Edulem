<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Her tenant için sistem rolleri oluştur
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            $this->createRolesForTenant($tenant);
        }
    }

    /**
     * Create system roles for a tenant.
     *
     * @param  \App\Models\Tenant  $tenant
     * @return void
     */
    protected function createRolesForTenant(Tenant $tenant): void
    {
        // Kurum Sahibi (Level 0 - En üst, tenant seviyesi)
        $owner = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'owner',
            ],
            [
                'display_name' => 'Kurum Sahibi',
                'description' => 'Kurumun sahibi',
                'is_system' => true,
                'level' => 0,
                'sort_order' => 0,
            ]
        );

        // Genel Müdür (Level 1 - Kurum Sahibi altında)
        $generalManager = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Genel Müdür',
            ],
            [
                'parent_id' => $owner->id,
                'display_name' => 'Genel Müdür',
                'description' => 'Kurumun en üst yöneticisi - Tüm kampüslere erişebilir',
                'is_system' => true,
                'level' => 1,
                'sort_order' => 1,
                'scope' => 'all'
            ]
        );

        // Kampüs Müdürü (Level 2 - Genel Müdür altında)
        $campusManager = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Kampüs Müdürü',
            ],
            [
                'parent_id' => $generalManager->id,
                'display_name' => 'Kampüs Müdürü',
                'description' => 'Kampüs yönetimi - Kendi kampüslerine erişebilir',
                'is_system' => true,
                'level' => 2,
                'sort_order' => 2,
                'scope' => 'campus'
            ]
        );

        // Müdür (Level 3 - Kampüs Müdürü altında)
        $manager = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Müdür',
            ],
            [
                'parent_id' => $campusManager->id,
                'display_name' => 'Müdür',
                'description' => 'Müdür - Kendi kampüs ve kademelerine erişebilir',
                'is_system' => true,
                'level' => 3,
                'sort_order' => 3,
                'scope' => 'education_level'
            ]
        );

        // Müdür Yardımcısı (Level 3 - Müdür ile aynı yetkiler)
        $assistantManager = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Müdür Yardımcısı',
            ],
            [
                'parent_id' => $campusManager->id,
                'display_name' => 'Müdür Yardımcısı',
                'description' => 'Müdür Yardımcısı - Kendi kampüs ve kademelerine erişebilir (Müdür ile aynı yetkiler)',
                'is_system' => true,
                'level' => 3,
                'sort_order' => 4,
                'scope' => 'education_level'
            ]
        );

        // Öğretmen (Level 4 - Müdür altında)
        $teacher = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Öğretmen',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Öğretmen',
                'description' => 'Öğretmen - Atanan kampüs ve kademelere erişebilir',
                'is_system' => true,
                'level' => 4,
                'sort_order' => 5,
                'scope' => 'education_level'
            ]
        );

        // Sınıf Öğretmeni (Level 4 - Müdür altında)
        $classTeacher = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Sınıf Öğretmeni',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Sınıf Öğretmeni',
                'description' => 'Sınıf öğretmeni - Atanan kampüs ve kademelere erişebilir',
                'is_system' => true,
                'level' => 4,
                'sort_order' => 6,
                'scope' => 'education_level'
            ]
        );

        // Rehberlik (Level 4 - Müdür altında)
        $guidance = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Rehberlik',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Rehberlik',
                'description' => 'Rehberlik Servisi - Atanan kampüs ve kademelere erişebilir',
                'is_system' => true,
                'level' => 4,
                'sort_order' => 7,
                'scope' => 'education_level'
            ]
        );

        // Öğrenci İşleri (Level 4 - Müdür altında)
        $studentAffairs = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Öğrenci İşleri',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Öğrenci İşleri',
                'description' => 'Öğrenci İşleri - Atanan kampüs ve kademelere erişebilir',
                'is_system' => true,
                'level' => 4,
                'sort_order' => 8,
                'scope' => 'education_level'
            ]
        );

        // Muhasebe (Level 4 - Müdür altında)
        $accounting = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Muhasebe',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Muhasebe',
                'description' => 'Muhasebe - Atanan kampüs ve kademelere erişebilir',
                'is_system' => true,
                'level' => 4,
                'sort_order' => 9,
                'scope' => 'education_level'
            ]
        );

        // Veli (Level 5 - Bağımsız Veli Rolü)
        $guardian = Role::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'guardian',
            ],
            [
                'parent_id' => $manager->id,
                'display_name' => 'Veli',
                'description' => 'Öğrenci Velisi - Portal ve öğrenci takip ekranlarına erişebilir',
                'is_system' => true,
                'level' => 5,
                'sort_order' => 10,
                'scope' => 'student',
                'page_visibility' => [
                    'students' => false,
                    'users' => false,
                    'teacher_students' => false,
                    'schedules' => false,
                    'teacher_measurement' => false,
                    'attendances' => false,
                    'homework' => false,
                    'tutoring' => false,
                    'teacher_meetings' => false,
                    'counseling' => false,
                    'meal_menus' => true,
                    'duty_schedules' => false,
                    'scholarship_exams' => false,
                    'measurement' => false,
                    'notifications' => true,
                    'messages' => false,
                    'surveys' => false,
                    'institution' => false,
                    'time_slots' => false,
                    'sms_center' => false,
                    'permissions_roles' => false,
                ]
            ]
        );

        // İzinleri ata
        $this->assignPermissions($owner, 'all'); // Tüm izinler
        $this->assignPermissions($generalManager, 'all'); // Tüm izinler
        $this->assignPermissions($campusManager, [
            'campuses', 'branches', 'branches.read', 'students', 'schedules', 'attendances',
            'homeworks', 'tutoring', 'grades', 'reports', 'users', 'roles',
            'form_surveys', 'online_surveys',
        ]);
        $this->assignPermissions($manager, [
            'branches', 'education_levels', 'students', 'schedules', 'attendances',
            'homeworks', 'tutoring', 'grades', 'guidance_notes', 'reports', 'users',
            'form_surveys', 'online_surveys',
        ]);
        $this->assignPermissions($assistantManager, [
            'branches', 'education_levels', 'students', 'schedules', 'attendances',
            'homeworks', 'tutoring', 'grades', 'guidance_notes', 'reports', 'users',
            'form_surveys', 'online_surveys',
        ]);
        $this->assignPermissions($teacher, [
            'attendances.create', 'attendances.update', 'homeworks.create',
            'homeworks.update', 'grades.create', 'grades.update', 'questions.read',
            'questions.create', 'students.read',
        ]);
        $this->assignPermissions($classTeacher, [
            'attendances.create', 'attendances.update', 'homeworks.create',
            'homeworks.update', 'grades.create', 'grades.update', 'questions.read',
            'questions.create', 'students.read',
        ]);
        $this->assignPermissions($guidance, [
            'guidance_notes', 'question_targets', 'students.read', 'students.update',
            'reports.read',
        ]);
        $this->assignPermissions($studentAffairs, [
            'branches', 'students', 'schedules', 'attendances',
            'tutoring', 'grades', 'reports', 'users',
        ]);
        $this->assignPermissions($accounting, [
            'financial.read', 'financial.create', 'financial.update',
            'students.read', 'reports.read',
        ]);
        $this->assignPermissions($guardian, [
            'students.read',
        ]);
    }

    /**
     * Assign permissions to a role.
     *
     * @param  \App\Models\Role  $role
     * @param  string|array  $modules
     * @return void
     */
    protected function assignPermissions(Role $role, string|array $modules): void
    {
        if ($modules === 'all') {
            $permissions = Permission::all();
        } else {
            $permissionNames = [];
            foreach ($modules as $module) {
                // Check if it's a full module name (e.g., 'students') or specific permission (e.g., 'students.read')
                if (str_contains($module, '.')) {
                    // Specific permission
                    $permissionNames[] = $module;
                } else {
                    // Full module - add all CRUD permissions
                    $permissionNames[] = "{$module}.create";
                    $permissionNames[] = "{$module}.read";
                    $permissionNames[] = "{$module}.update";
                    $permissionNames[] = "{$module}.delete";
                    
                    // Add export if applicable
                    $exportPermission = Permission::where('name', "{$module}.export")->first();
                    if ($exportPermission) {
                        $permissionNames[] = "{$module}.export";
                    }
                }
            }
            $permissions = Permission::whereIn('name', $permissionNames)->get();
        }

        $role->permissions()->sync($permissions->pluck('id'));
    }
}
