<?php

namespace App\Traits;

use App\Models\ActivityLog;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;

trait Loggable
{
    /**
     * Boot the trait.
     *
     * @return void
     */
    protected static function bootLoggable(): void
    {
        // Updating event - değişiklikleri logla
        static::updating(function ($model) {
            if ($model->isDirty()) {
                $activityLogService = app(ActivityLogService::class);
                $activityLogService->logUpdate($model);
            }
        });

        // Deleting event - silme işlemini logla
        static::deleting(function ($model) {
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logDelete($model);
        });

        // Created event - oluşturma işlemini logla
        static::created(function ($model) {
            $activityLogService = app(ActivityLogService::class);
            $activityLogService->logCreate($model);
        });
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return $this->fillable ?? [];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['password', 'remember_token'];
    }
}
