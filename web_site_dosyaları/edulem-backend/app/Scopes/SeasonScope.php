<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use App\Models\Season;

class SeasonScope implements Scope
{
    protected static array $hasColumnCache = [];

    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $table = $model->getTable();
        if (! static::hasSeasonIdColumn($table)) {
            return;
        }

        $seasonId = $this->getSeasonId();

        if ($seasonId) {
            $builder->where($table . '.season_id', $seasonId);
        }
    }

    public static function hasSeasonIdColumn(string $table): bool
    {
        if (! array_key_exists($table, static::$hasColumnCache)) {
            try {
                static::$hasColumnCache[$table] = Schema::hasColumn($table, 'season_id');
            } catch (\Throwable $e) {
                static::$hasColumnCache[$table] = false;
            }
        }

        return static::$hasColumnCache[$table];
    }

    /**
     * Get the current season ID.
     */
    protected function getSeasonId(): ?int
    {
        $id = null;

        // 1. Check Request Query
        if (request()->has('season_id')) {
            $id = (int) request('season_id');
        }

        // 2. Check Request Header
        if (!$id && request()->hasHeader('X-Season-Id')) {
            $id = (int) request()->header('X-Season-Id');
        }

        // Security Check: If ID is provided, ensure it belongs to the user's tenant
        if ($id && Auth::check()) {
            $tenantId = Auth::user()->tenant_id;
            $exists = Season::where('id', $id)->where('tenant_id', $tenantId)->exists();
            if ($exists) {
                return $id;
            }
            // If not found in tenant, fall back to default logic
            $id = null;
        }

        if ($id) return $id;

        // 3. Fallback to Active Season for the tenant
        if (Auth::check()) {
            $tenantId = Auth::user()->tenant_id;
            return \Illuminate\Support\Facades\Cache::remember("active_season_tenant_{$tenantId}", 3600, function () use ($tenantId) {
                return Season::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->value('id');
            });
        }

        return null;
    }
}
