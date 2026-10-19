<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant;
use App\Models\User;

class QuickDemoSeeder extends Seeder
{
    public function run(): void
    {
        // Mevcut tenant'ı bul
        $tenant = Tenant::where('domain', 'demo')->first();
        
        if (!$tenant) {
            // Tenant oluştur
            $tenant = Tenant::create([
                'domain' => 'demo',
                'name' => 'Demo Okul',
                'is_active' => true
            ]);
        }

        // Admin kullanıcı oluştur
        $user = User::create([
            'name' => 'Demo Admin',
            'email' => 'admin@demo.com',
            'password' => bcrypt('password'),
            'tenant_id' => $tenant->id
        ]);

        $this->command->info('✅ Demo kullanıcı oluşturuldu!');
        $this->command->info('📧 Email: admin@demo.com');
        $this->command->info('🔑 Password: password');
    }
}
