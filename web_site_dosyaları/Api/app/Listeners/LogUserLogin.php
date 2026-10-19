<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Auth\Events\Login;

class LogUserLogin
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
    public function handle(Login $event): void
    {
        if ($event->user instanceof User) {
            $this->activityLogService->logLogin($event->user);
        }
    }
}
