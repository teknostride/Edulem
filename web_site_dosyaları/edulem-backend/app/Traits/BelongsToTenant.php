<?php

namespace App\Traits;

use App\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToTenant
{
    /**
     * Boot the trait.
     *
     * @return void
     */
    protected static function bootBelongsToTenant(): void
    {
        // Global Scope'u ekle
        static::addGlobalScope(new TenantScope());

        // Creating event'inde tenant_id'yi otomatik doldur
        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $model->tenant_id = static::getCurrentTenantId();
            }
        });
    }

    /**
     * Get the current tenant ID.
     *
     * @return int|null
     */
    protected static function getCurrentTenantId(): ?int
    {
        // Önce authenticated user'dan tenant_id al
        if (auth()->check() && auth()->user()->tenant_id) {
            return auth()->user()->tenant_id;
        }

        // Alternatif olarak session'dan al
        if (session()->has('tenant_id')) {
            return session('tenant_id');
        }

        return null;
    }

    /**
     * Query scope to get records without tenant scope.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithoutTenantScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }

    /**
     * Query scope to get records from all tenants.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeWithAllTenants(Builder $query): Builder
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }
}
