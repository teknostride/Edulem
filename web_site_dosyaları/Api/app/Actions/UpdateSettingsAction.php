<?php

namespace App\Actions;

use App\Models\Setting;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class UpdateSettingsAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to update settings.
     *
     * @param  array  $settingsData
     * @return array
     * @throws \Exception
     */
    public function execute(array $settingsData): array
    {
        return DB::transaction(function () use ($settingsData) {
            $tenantId = Auth::user()->tenant_id;
            $updatedSettings = [];

            foreach ($settingsData['settings'] as $settingData) {
                $value = $settingData['value'];
                
                // Array veya object ise JSON'a çevir
                if (is_array($value) || is_object($value)) {
                    $value = json_encode($value);
                    $type = $settingData['type'] ?? 'json';
                } else {
                    $type = $settingData['type'] ?? 'string';
                }

                $setting = Setting::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'key' => $settingData['key'],
                    ],
                    [
                        'value' => $value,
                        'type' => $type,
                        'group' => $settingData['group'] ?? 'general',
                        'description' => $settingData['description'] ?? null,
                        'is_public' => $settingData['is_public'] ?? false,
                    ]
                );

                $updatedSettings[] = $setting;
                
                // Activity log (sadece güncelleme durumunda)
                if ($setting->wasRecentlyCreated) {
                    $this->activityLogService->logCreate($setting);
                } else {
                    $this->activityLogService->logUpdate($setting);
                }
            }

            // Cache'i temizle
            $this->clearSettingsCache($tenantId);

            return $updatedSettings;
        });
    }

    /**
     * Clear settings cache for tenant.
     *
     * @param  int  $tenantId
     * @return void
     */
    protected function clearSettingsCache(int $tenantId): void
    {
        // Tüm grup cache'lerini temizle
        $groups = Setting::where('tenant_id', $tenantId)
            ->distinct()
            ->pluck('group')
            ->toArray();

        foreach ($groups as $group) {
            Cache::forget("settings.tenant.{$tenantId}.group.{$group}");
        }

        // Genel cache'i temizle
        Cache::forget("settings.tenant.{$tenantId}");
    }
}
