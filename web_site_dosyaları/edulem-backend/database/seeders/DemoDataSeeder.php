<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Demo Tenant Oluştur
        $tenant = Tenant::firstOrCreate(
            ['domain' => 'demo'],
            [
                'name' => 'Demo Okulu',
                'is_active' => true,
            ]
        );

        echo "✅ Tenant oluşturuldu: {$tenant->name} (ID: {$tenant->id})\n";

        // 2. SuperAdmin Kullanıcı Oluştur
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@premiumedu.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('admin123'),
                'is_superadmin' => true,
                'tenant_id' => null, // SuperAdmin için tenant_id null
            ]
        );

        echo "✅ SuperAdmin oluşturuldu: {$superAdmin->email} (ID: {$superAdmin->id})\n";

        // 3. Tenant'a Bağlı Demo Kullanıcı Oluştur
        $demoUser = User::firstOrCreate(
            ['email' => 'mudur@demo.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Okul Müdürü',
                'password' => Hash::make('mudur123'),
                'is_superadmin' => false,
            ]
        );

        echo "✅ Demo kullanıcı oluşturuldu: {$demoUser->email} (ID: {$demoUser->id})\n";

        echo "\n🎉 Demo veriler başarıyla oluşturuldu!\n\n";
        echo "📋 Giriş Bilgileri:\n";
        echo "   SuperAdmin: admin@premiumedu.com / admin123\n";
        echo "   Demo Kullanıcı: mudur@demo.com / mudur123\n";
    }
}
