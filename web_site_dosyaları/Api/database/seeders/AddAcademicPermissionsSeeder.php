<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class AddAcademicPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Bu seeder, mevcut tüm rollere academic.* permission'larını ekler.
     * Geriye dönük uyumluluk için gereklidir.
     */
    public function run(): void
    {
        // Önce academic permission'larının var olduğundan emin ol
        $academicPermissions = Permission::where('module', 'academic')->get();
        
        if ($academicPermissions->isEmpty()) {
            $this->command->warn('Academic permission\'ları bulunamadı. Önce PermissionSeeder çalıştırın.');
            return;
        }

        // Tüm rolleri al
        $roles = Role::all();

        foreach ($roles as $role) {
            // Mevcut permission'ları al
            $existingPermissionIds = $role->permissions()->pluck('permissions.id')->toArray();
            
            // Academic permission ID'lerini al
            $academicPermissionIds = $academicPermissions->pluck('id')->toArray();
            
            // Yeni permission ID'leri ekle (duplicate olmadan)
            $newPermissionIds = array_unique(array_merge($existingPermissionIds, $academicPermissionIds));
            
            // Role'e permission'ları ata
            $role->permissions()->sync($newPermissionIds);
            
            $this->command->info("Role '{$role->display_name}' ({$role->name}) için academic permission'ları eklendi.");
        }

        $this->command->info('Tüm rollere academic permission\'ları başarıyla eklendi.');
    }
}
