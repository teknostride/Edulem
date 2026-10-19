<?php

namespace App\Actions;

use App\Models\CalendarEvent;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateCalendarEventAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create a calendar event.
     *
     * @param  array  $eventData
     * @return \App\Models\CalendarEvent
     * @throws \Exception
     */
    public function execute(array $eventData): CalendarEvent
    {
        return DB::transaction(function () use ($eventData) {
            $event = CalendarEvent::create([
                'title' => $eventData['title'],
                'description' => $eventData['description'] ?? null,
                'event_type' => $eventData['event_type'],
                'event_date' => $eventData['event_date'],
                'start_time' => $eventData['start_time'] ?? null,
                'end_time' => $eventData['end_time'] ?? null,
                'location' => $eventData['location'] ?? null,
                'target_audience' => $eventData['target_audience'],
                'is_all_day' => $eventData['is_all_day'] ?? false,
                'is_public' => $eventData['is_public'] ?? true,
                'related_data' => $eventData['related_data'] ?? null,
                'notes' => $eventData['notes'] ?? null,
                'reminders' => $eventData['reminders'] ?? null,
                'created_by' => Auth::id(),
            ]);

            // Activity log
            $this->activityLogService->logCreate($event);

            // İlişkileri yükle
            $event->load(['creator']);

            return $event;
        });
    }
}
