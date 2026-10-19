<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model): void
    {
        // SuperAdmin tüm tenant'ları görebilir
        if (Auth::check() && Auth::user()->is_superadmin) {
            return;
        }

        $tenantId = $this->getTenantId();

        if ($tenantId) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        }
    }

    /**
     * Extend the query builder with the needed functions.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @return void
     */
    public function extend(Builder $builder): void
    {
        $builder->macro('withoutTenantScope', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });

        $builder->macro('withAllTenants', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });
    }

    /**
     * Get the current tenant ID.
     *
     * @return int|null
     */
    protected function getTenantId(): ?int
    {
        // Impersonation durumunda target user'ın tenant_id'sini kullan
        if (session('impersonating') && session('impersonated_user_id')) {
            $targetUser = \App\Models\User::find(session('impersonated_user_id'));
            if ($targetUser && $targetUser->tenant_id) {
                return $targetUser->tenant_id;
            }
        }

        // Önce authenticated user'dan tenant_id al
        if (Auth::check() && Auth::user()->tenant_id) {
            return Auth::user()->tenant_id;
        }

        // Alternatif olarak session'dan al (eğer farklı bir yöntem kullanılıyorsa)
        if (session()->has('tenant_id')) {
            return session('tenant_id');
        }

        return null;
    }
}
