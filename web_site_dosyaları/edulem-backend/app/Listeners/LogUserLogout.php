<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Auth\Events\Logout;

class LogUserLogout
{
    /**
     * Create the event listener.
     */
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {
    }

    /**
     * Handle the event.
     */
    public function handle(Logout $event): void
    {
        if ($event->user instanceof User) {
            $this->activityLogService->logLogout($event->user);
        }
    }
}
