<?php

namespace App\Traits;

use App\Scopes\SeasonScope;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToSeason
{
    protected static function bootBelongsToSeason(): void
    {
        static::addGlobalScope(new SeasonScope());

        static::creating(function ($model) {
            if (empty($model->season_id)) {
                if (SeasonScope::hasSeasonIdColumn($model->getTable())) {
                    $model->season_id = static::getCurrentSeasonId();
                }
            }
        });
    }

    public function season(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Season::class);
    }

    protected static function getCurrentSeasonId(): ?int
    {
        // Reuse logic from SeasonScope via a static call or directly
        // For simplicity, we can use the same logic here
        if (request()->has('season_id')) {
            return (int) request('season_id');
        }

        if (request()->hasHeader('X-Season-Id')) {
            return (int) request()->header('X-Season-Id');
        }

        if (auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
            return \Illuminate\Support\Facades\Cache::remember("active_season_tenant_{$tenantId}", 3600, function () use ($tenantId) {
                return \App\Models\Season::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->value('id');
            });
        }

        return null;
    }
}
