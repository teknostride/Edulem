<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = $this->getAllPermissions();

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission['name']],
                $permission
            );
        }
    }

    /**
     * Get all permissions for all modules
     */
    protected function getAllPermissions(): array
    {
        $modules = [
            'leads', 'students', 'schedules', 'attendances', 'homeworks',
            'tutoring', 'exam_classrooms', 'exam_evaluation', 'question_targets',
            'online_exams', 'scholarship_exams', 'grades', 'guidance_notes',
            'activities', 'curriculum', 'questions', 'meal_menus', 'bulletins',
            'portals', 'hr', 'staff', 'staff_assignments', 'meetings',
            'clinic', 'library', 'form_surveys', 'online_surveys', 'messages',
            'communication', 'auto_sms', 'permissions', 'calendar', 'question_banks',
            'financial', 'reports', 'settings', 'roles', 'users',
            'campuses', 'branches', 'education_levels', 'academic',
        ];

        $actions = ['create', 'read', 'update', 'delete', 'export', 'approve'];
        
        $permissions = [];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                // Some modules don't need all actions
                if ($this->shouldSkipAction($module, $action)) {
                    continue;
                }

                $permissions[] = [
                    'module' => $module,
                    'action' => $action,
                    'name' => "{$module}.{$action}",
                    'description' => $this->getPermissionDescription($module, $action),
                ];
            }
        }

        return $permissions;
    }

    /**
     * Check if action should be skipped for a module
     */
    protected function shouldSkipAction(string $module, string $action): bool
    {
        // Reports only need read and export
        if ($module === 'reports' && !in_array($action, ['read', 'export'])) {
            return true;
        }

        // Settings only need read and update
        if ($module === 'settings' && !in_array($action, ['read', 'update'])) {
            return true;
        }

        // Auto SMS doesn't need create/update/delete (system managed)
        if ($module === 'auto_sms' && in_array($action, ['create', 'update', 'delete'])) {
            return true;
        }

        // Portals are read-only for most actions
        if ($module === 'portals' && in_array($action, ['create', 'update', 'delete', 'approve'])) {
            return true;
        }

        return false;
    }

    /**
     * Get permission description
     */
    protected function getPermissionDescription(string $module, string $action): string
    {
        $moduleNames = [
            'leads' => 'Ön Kayıt (CRM)',
            'students' => 'Öğrenci',
            'schedules' => 'Ders Programı',
            'attendances' => 'Devamsızlık',
            'homeworks' => 'Ödev',
            'tutoring' => 'Etüt',
            'exam_classrooms' => 'Sınav Sınıfı',
            'exam_evaluation' => 'Sınav Değerlendirme',
            'question_targets' => 'Hedef Soru',
            'online_exams' => 'Online Sınav',
            'scholarship_exams' => 'Bursluluk Sınavı',
            'grades' => 'Yazılı/Sözlü Notlar',
            'guidance_notes' => 'Rehberlik Notları',
            'activities' => 'Etkinlik',
            'curriculum' => 'Müfredat Takip',
            'questions' => 'Sorum Var',
            'meal_menus' => 'Yemek Menü',
            'bulletins' => 'Bülten',
            'portals' => 'Veli/Öğrenci Portal',
            'hr' => 'İnsan Kaynakları',
            'staff' => 'Personel',
            'staff_assignments' => 'Personel Görevlendirme',
            'meetings' => 'Toplantı',
            'clinic' => 'Revir',
            'library' => 'Kütüphane',
            'form_surveys' => 'Form Anketler',
            'online_surveys' => 'Online Anket',
            'messages' => 'Sistem İçi Mesaj',
            'communication' => 'SMS/Bildirim',
            'auto_sms' => 'Otomatik SMS',
            'permissions' => 'Kullanıcı Yetkilendirme',
            'calendar' => 'Ajanda/Akademik Takvim',
            'question_banks' => 'Soru Havuzu',
            'financial' => 'Finansal İşlemler',
            'reports' => 'Raporlar',
            'settings' => 'Ayarlar',
            'roles' => 'Roller',
            'users' => 'Kullanıcılar',
            'campuses' => 'Kampüsler',
            'branches' => 'Şubeler',
            'education_levels' => 'Eğitim Seviyeleri',
            'academic' => 'Akademik İşlemler (Sınıf, Ders, Program, Devamsızlık)',
        ];

        $actionNames = [
            'create' => 'Oluşturma',
            'read' => 'Görüntüleme',
            'update' => 'Güncelleme',
            'delete' => 'Silme',
            'export' => 'Dışa Aktarma',
            'approve' => 'Onaylama',
        ];

        $moduleName = $moduleNames[$module] ?? $module;
        $actionName = $actionNames[$action] ?? $action;

        return "{$moduleName} {$actionName}";
    }
}
