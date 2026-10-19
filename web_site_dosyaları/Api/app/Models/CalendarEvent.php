<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class CalendarEvent extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'event_type',
        'event_date',
        'start_time',
        'end_time',
        'location',
        'target_audience',
        'is_all_day',
        'is_public',
        'related_data',
        'notes',
        'reminders',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'target_audience' => 'array',
            'related_data' => 'array',
            'reminders' => 'array',
            'event_date' => 'date',
            'is_all_day' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CalendarEventParticipant::class);
    }

    public function userParticipants(): HasMany
    {
        return $this->hasMany(CalendarEventParticipant::class)->where('participant_type', 'user');
    }

    public function studentParticipants(): HasMany
    {
        return $this->hasMany(CalendarEventParticipant::class)->where('participant_type', 'student');
    }

    public function guardianParticipants(): HasMany
    {
        return $this->hasMany(CalendarEventParticipant::class)->where('participant_type', 'guardian');
    }

    /**
     * Check if event is all day.
     *
     * @return bool
     */
    public function isAllDay(): bool
    {
        return $this->is_all_day;
    }

    /**
     * Check if event is public.
     *
     * @return bool
     */
    public function isPublic(): bool
    {
        return $this->is_public;
    }

    /**
     * Check if event is today.
     *
     * @return bool
     */
    public function isToday(): bool
    {
        return $this->event_date->isToday();
    }

    /**
     * Check if event is past.
     *
     * @return bool
     */
    public function isPast(): bool
    {
        if ($this->is_all_day) {
            return $this->event_date->isPast();
        }

        $eventDateTime = Carbon::parse($this->event_date->format('Y-m-d') . ' ' . $this->end_time);
        return $eventDateTime->isPast();
    }

    /**
     * Check if event is upcoming.
     *
     * @return bool
     */
    public function isUpcoming(): bool
    {
        return !$this->isPast();
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'title',
            'event_type',
            'event_date',
            'start_time',
            'end_time',
            'is_public',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['description', 'notes', 'related_data', 'reminders'];
    }
}
