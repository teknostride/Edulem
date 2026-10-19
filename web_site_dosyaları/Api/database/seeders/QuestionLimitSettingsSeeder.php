<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class QuestionLimitSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tüm tenant'lar için soru günlük limiti ayarlarını ekle
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            // Öğrenci günlük soru limiti (varsayılan: 5)
            Setting::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'key' => 'question_daily_limit_student',
                ],
                [
                    'value' => '5',
                    'type' => 'integer',
                    'group' => 'question',
                    'description' => 'Öğrenciler için günlük soru sorma limiti.',
                    'is_public' => false,
                ]
            );

            // Veli günlük soru limiti (varsayılan: 5)
            Setting::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'key' => 'question_daily_limit_guardian',
                ],
                [
                    'value' => '5',
                    'type' => 'integer',
                    'group' => 'question',
                    'description' => 'Veliler için günlük soru sorma limiti.',
                    'is_public' => false,
                ]
            );

            // Soru limiti aktif/pasif durumu (varsayılan: aktif)
            Setting::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'key' => 'question_daily_limit_enabled',
                ],
                [
                    'value' => 'true',
                    'type' => 'boolean',
                    'group' => 'question',
                    'description' => 'Günlük soru limiti kontrolünün aktif/pasif durumu.',
                    'is_public' => false,
                ]
            );
        }

        $this->command->info('✅ Soru günlük limiti ayarları eklendi.');
        $this->command->info('   Öğrenci limiti: 5 soru/gün (varsayılan)');
        $this->command->info('   Veli limiti: 5 soru/gün (varsayılan)');
        $this->command->info('   Kurucular Tenant Settings üzerinden bu ayarları değiştirebilir.');
    }
}
