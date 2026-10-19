<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class SmsSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tüm tenant'lar için SMS bildirim ayarını ekle (varsayılan: kapalı)
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            Setting::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'key' => 'sms_notification_enabled',
                ],
                [
                    'value' => 'false', // Varsayılan olarak kapalı
                    'type' => 'boolean',
                    'group' => 'sms',
                    'description' => 'SMS bildirimlerinin aktif/pasif durumu. Kurucu bu ayarı kontrol edebilir.',
                    'is_public' => false,
                ]
            );
        }

        $this->command->info('✅ SMS bildirim ayarları eklendi. Varsayılan: Kapalı (false)');
        $this->command->info('   Kurucular Tenant Settings üzerinden bu ayarı açabilir/kapatabilir.');
    }
}
