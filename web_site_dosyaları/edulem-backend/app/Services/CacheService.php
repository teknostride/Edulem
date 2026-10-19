<?php

namespace App\Services;

use App\Models\City;
use App\Models\District;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class CacheService
{
    /**
     * Cache prefix for tenant-specific data.
     *
     * @param  int  $tenantId
     * @return string
     */
    protected function tenantPrefix(int $tenantId): string
    {
        return "tenant:{$tenantId}:";
    }

    /**
     * Cache permissions for a role.
     *
     * @param  int  $roleId
     * @param  array  $permissions
     * @param  int  $tenantId
     * @param  int  $ttl  Time to live in seconds (default: 1 hour)
     * @return void
     */
    public function cacheRolePermissions(int $roleId, array $permissions, int $tenantId, int $ttl = 3600): void
    {
        $key = $this->tenantPrefix($tenantId) . "role:{$roleId}:permissions";
        Cache::put($key, $permissions, $ttl);
    }

    /**
     * Get cached permissions for a role.
     *
     * @param  int  $roleId
     * @param  int  $tenantId
     * @return array|null
     */
    public function getCachedRolePermissions(int $roleId, int $tenantId): ?array
    {
        $key = $this->tenantPrefix($tenantId) . "role:{$roleId}:permissions";
        return Cache::get($key);
    }

    /**
     * Cache cities list.
     *
     * @param  array  $cities
     * @param  int  $ttl  Time to live in seconds (default: 24 hours)
     * @return void
     */
    public function cacheCities(array $cities, int $ttl = 86400): void
    {
        Cache::put('cities:list', $cities, $ttl);
    }

    /**
     * Get cached cities list.
     *
     * @return array|null
     */
    public function getCachedCities(): ?array
    {
        return Cache::get('cities:list');
    }

    /**
     * Cache districts for a city.
     *
     * @param  int  $cityId
     * @param  array  $districts
     * @param  int  $ttl  Time to live in seconds (default: 24 hours)
     * @return void
     */
    public function cacheDistricts(int $cityId, array $districts, int $ttl = 86400): void
    {
        Cache::put("districts:city:{$cityId}", $districts, $ttl);
    }

    /**
     * Get cached districts for a city.
     *
     * @param  int  $cityId
     * @return array|null
     */
    public function getCachedDistricts(int $cityId): ?array
    {
        return Cache::get("districts:city:{$cityId}");
    }

    /**
     * Get all cities (cached).
     *
     * @param  int  $ttl  Time to live in seconds (default: 24 hours)
     * @return \Illuminate\Database\Eloquent\Collection<int, \App\Models\City>
     */
    public function getCities(int $ttl = 86400): EloquentCollection
    {
        return Cache::remember('cities:list', $ttl, function () {
            return City::query()->orderBy('name')->get();
        });
    }

    /**
     * Get districts by city id (cached).
     *
     * @param  int  $cityId
     * @param  int  $ttl  Time to live in seconds (default: 24 hours)
     * @return \Illuminate\Database\Eloquent\Collection<int, \App\Models\District>
     */
    public function getDistricts(int $cityId, int $ttl = 86400): EloquentCollection
    {
        return Cache::remember("districts:city:{$cityId}", $ttl, function () use ($cityId) {
            return District::query()->where('city_id', $cityId)->orderBy('name')->get();
        });
    }

    /**
     * Clear tenant-specific cache.
     *
     * @param  int  $tenantId
     * @return void
     */
    public function clearTenantCache(int $tenantId): void
    {
        $pattern = $this->tenantPrefix($tenantId) . '*';
        
        // Redis pattern matching
        $keys = Redis::keys($pattern);
        if (!empty($keys)) {
            Redis::del($keys);
        }
    }

    /**
     * Clear all cache.
     *
     * @return void
     */
    public function clearAllCache(): void
    {
        Cache::flush();
    }

    /**
     * Cache feature flags for a tenant.
     *
     * @param  int  $tenantId
     * @param  array  $features
     * @param  int  $ttl  Time to live in seconds (default: 1 hour)
     * @return void
     */
    public function cacheFeatureFlags(int $tenantId, array $features, int $ttl = 3600): void
    {
        $key = $this->tenantPrefix($tenantId) . 'feature_flags';
        Cache::put($key, $features, $ttl);
    }

    /**
     * Get cached feature flags for a tenant.
     *
     * @param  int  $tenantId
     * @return array|null
     */
    public function getCachedFeatureFlags(int $tenantId): ?array
    {
        $key = $this->tenantPrefix($tenantId) . 'feature_flags';
        return Cache::get($key);
    }

    /**
     * Check if a feature is enabled for a tenant.
     *
     * @param  int  $tenantId
     * @param  string  $featureName
     * @return bool
     */
    public function isFeatureEnabled(int $tenantId, string $featureName): bool
    {
        $features = $this->getCachedFeatureFlags($tenantId);
        
        if ($features === null) {
            // Cache'de yoksa veritabanından oku
            $setting = \App\Models\Setting::where('tenant_id', $tenantId)
                ->where('key', "feature_{$featureName}")
                ->first();
            
            return $setting && filter_var($setting->value, FILTER_VALIDATE_BOOLEAN);
        }

        return isset($features[$featureName]) && $features[$featureName] === true;
    }

    /**
     * Cache package information for a tenant.
     *
     * @param  int  $tenantId
     * @param  array  $package
     * @param  int  $ttl  Time to live in seconds (default: 1 hour)
     * @return void
     */
    public function cachePackageInfo(int $tenantId, array $package, int $ttl = 3600): void
    {
        $key = $this->tenantPrefix($tenantId) . 'package_info';
        Cache::put($key, $package, $ttl);
    }

    /**
     * Get cached package information for a tenant.
     *
     * @param  int  $tenantId
     * @return array|null
     */
    public function getCachedPackageInfo(int $tenantId): ?array
    {
        $key = $this->tenantPrefix($tenantId) . 'package_info';
        return Cache::get($key);
    }

    /**
     * Check if a module is available in tenant's package.
     *
     * @param  int  $tenantId
     * @param  string  $moduleName
     * @return bool
     */
    public function isModuleAvailable(int $tenantId, string $moduleName): bool
    {
        $package = $this->getCachedPackageInfo($tenantId);
        
        if ($package === null) {
            // Cache'de yoksa veritabanından oku
            $setting = \App\Models\Setting::where('tenant_id', $tenantId)
                ->where('key', 'package_modules')
                ->first();
            
            if ($setting) {
                $modules = json_decode($setting->value, true) ?? [];
                return in_array($moduleName, $modules);
            }
            
            return false;
        }

        $modules = $package['modules'] ?? [];
        return in_array($moduleName, $modules);
    }
}
