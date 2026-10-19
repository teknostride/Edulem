<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class CreateDemoUser extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name' => 'Demo User',
            'email' => 'demo@okul.com',
            'password' => bcrypt('password'),
            'tenant_id' => 1,
        ]);

        echo "✅ Demo kullanıcı oluşturuldu:\n";
        echo "   Email: {$user->email}\n";
        echo "   Şifre: password\n";
        echo "   Tenant ID: {$user->tenant_id}\n";
    }
}
