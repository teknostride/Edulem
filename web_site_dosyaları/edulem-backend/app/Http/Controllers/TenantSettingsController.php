<?php

namespace App\Http\Controllers;

use App\Actions\UpdateSettingsAction;
use App\Http\Requests\UpdateSettingsRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class TenantSettingsController extends ApiController
{
    /**
     * Get tenant settings.
     *
     * @param  string|null  $group
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(?string $group = null): JsonResponse
    {
        Gate::authorize('viewAny', Setting::class);

        try {
            $tenantId = auth()->user()->tenant_id;
            $cacheKey = $group 
                ? "settings.tenant.{$tenantId}.group.{$group}"
                : "settings.tenant.{$tenantId}";

            $settings = Cache::remember($cacheKey, 3600, function () use ($tenantId, $group) {
                $query = Setting::where('tenant_id', $tenantId);

                if ($group) {
                    $query->where('group', $group);
                }

                return $query->get();
            });

            // Public ayarlar ve yönetici ayarları
            $user = auth()->user();
            $filteredSettings = $settings->filter(function ($setting) use ($user) {
                if ($setting->is_public) {
                    return true;
                }
                return $user->hasPermission('academic.read');
            });

            // Key-value formatında döndür
            $settingsArray = $filteredSettings->mapWithKeys(function ($setting) {
                return [$setting->key => $setting->typed_value];
            });

            // Gruplara göre organize et
            $groupedSettings = $filteredSettings->groupBy('group')->map(function ($groupSettings) {
                return $groupSettings->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->typed_value];
                });
            });

            return $this->success([
                'settings' => $settingsArray,
                'grouped' => $groupedSettings,
                'groups' => $filteredSettings->pluck('group')->unique()->values(),
            ], 'Ayarlar başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Ayarlar getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get a specific setting.
     *
     * @param  string  $key
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(string $key): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $setting = Setting::where('tenant_id', $tenantId)
            ->where('key', $key)
            ->firstOrFail();

        Gate::authorize('view', $setting);

        return $this->success(new SettingResource($setting), 'Ayar başarıyla getirildi.');
    }

    /**
     * Update tenant settings.
     *
     * @param  \App\Http\Requests\UpdateSettingsRequest  $request
     * @param  \App\Actions\UpdateSettingsAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(UpdateSettingsRequest $request, UpdateSettingsAction $action): JsonResponse
    {
        Gate::authorize('create', Setting::class);

        try {
            $updatedSettings = $action->execute($request->validated());

            return $this->success([
                'settings' => SettingResource::collection($updatedSettings),
            ], 'Ayarlar başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Ayarlar güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete a setting.
     *
     * @param  string  $key
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(string $key): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $setting = Setting::where('tenant_id', $tenantId)
            ->where('key', $key)
            ->firstOrFail();

        Gate::authorize('delete', $setting);

        try {
            $setting->delete();
            
            // Cache'i temizle
            Cache::forget("settings.tenant.{$tenantId}.group.{$setting->group}");
            Cache::forget("settings.tenant.{$tenantId}");

            return $this->success([], 'Ayar başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Ayar silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
