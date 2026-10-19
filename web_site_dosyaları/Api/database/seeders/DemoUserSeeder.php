<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Demo kullanıcıyı bul
        $user = User::where('email', 'mudur@demo.com')->first();

        if (!$user) {
            echo "Demo kullanıcı bulunamadı!\n";
            return;
        }

        // Demo tenant'ı bul
        $tenant = \App\Models\Tenant::where('domain', 'demo')->first();

        if (!$tenant) {
            echo "Demo tenant bulunamadı!\n";
            return;
        }

        // Genel Müdür rolünü bul veya oluştur
        $role = Role::where('tenant_id', $tenant->id)
            ->where('name', 'general_manager')
            ->first();

        if (!$role) {
            // Role yoksa oluştur
            $role = Role::create([
                'tenant_id' => $tenant->id,
                'name' => 'general_manager',
                'display_name' => 'Genel Müdür',
                'description' => 'Kurumun en üst yöneticisi',
                'is_system' => true,
                'level' => 1,
                'sort_order' => 1,
            ]);

            // Tüm izinleri ata
            $permissions = Permission::all();
            $role->permissions()->sync($permissions->pluck('id'));

            echo "✅ Genel Müdür rolü oluşturuldu ve tüm izinler atandı.\n";
        }

        // Kullanıcıya rolü ata
        $user->role_id = $role->id;
        $user->save();

        echo "✅ Demo kullanıcıya Genel Müdür rolü atandı.\n";
        echo "   Kullanıcı: {$user->name} ({$user->email})\n";
        echo "   Rol: {$role->display_name}\n";
        echo "   İzin Sayısı: " . $role->permissions->count() . "\n";
    }
}
