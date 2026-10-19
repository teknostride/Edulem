<?php

namespace App\Actions;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateTenantAction
{
    /**
     * Execute the action to create a tenant with admin user.
     *
     * @param  array  $data
     * @return \App\Models\Tenant
     */
    public function execute(array $data): Tenant
    {
        return DB::transaction(function () use ($data) {
            // 1. Tenant oluştur
            $tenant = Tenant::create([
                'domain' => $data['domain'],
                'name' => $data['name'],
                'is_active' => $data['is_active'] ?? true,
            ]);

            // 2. Kurum Sahibi (Owner) rolünü bul veya oluştur
            $role = Role::firstOrCreate(
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

            // 3. Kurum Sahibi rolüne tüm izinleri ata (eğer yeni oluşturulduysa)
            if ($role->wasRecentlyCreated) {
                $permissions = Permission::all();
                $role->permissions()->sync($permissions->pluck('id'));
            }

            // 4. Admin kullanıcısı oluştur
            if (isset($data['admin_name']) && isset($data['admin_email'])) {
                // Şifre boş bırakılırsa otomatik 123456
                $password = !empty($data['admin_password']) ? $data['admin_password'] : '123456';
                
                $adminUser = User::create([
                    'tenant_id' => $tenant->id,
                    'name' => $data['admin_name'],
                    'email' => $data['admin_email'],
                    'password' => Hash::make($password),
                    'role_id' => $role->id,
                    'is_superadmin' => false,
                ]);
            }

            // İleride tenant oluşturulduğunda varsayılan ayarları oluşturabiliriz
            // $this->createDefaultSettings($tenant);

            return $tenant;
        });
    }
}
