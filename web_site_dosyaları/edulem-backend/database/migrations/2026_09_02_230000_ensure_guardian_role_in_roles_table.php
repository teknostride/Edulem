<?php

use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tenants = Tenant::all();

        $defaultPageVisibility = [
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
        ];

        foreach ($tenants as $tenant) {
            $managerRole = Role::where('tenant_id', $tenant->id)->where('name', 'Müdür')->first();

            Role::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'guardian',
                ],
                [
                    'parent_id' => $managerRole?->id,
                    'display_name' => 'Veli',
                    'description' => 'Öğrenci Velisi - Portal ve öğrenci takip ekranlarına erişebilir',
                    'is_system' => true,
                    'level' => 5,
                    'sort_order' => 10,
                    'scope' => 'student',
                    'page_visibility' => $defaultPageVisibility,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep role for data integrity
    }
};
