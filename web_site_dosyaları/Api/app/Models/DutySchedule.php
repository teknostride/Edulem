<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DutySchedule extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'user_id',
        'campus_id',
        'education_level_id',
        'day_of_week',
        'start_time',
        'end_time',
        'location',
        'notes',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the tenant that owns the duty schedule.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user (personel) assigned to this duty.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class);
    }

    /**
     * Check if duty schedule conflicts with another duty schedule.
     *
     * @param  \App\Models\DutySchedule  $other
     * @return bool
     */
    public function conflictsWith(DutySchedule $other): bool
    {
        if ($this->user_id !== $other->user_id) {
            return false;
        }

        if ($this->day_of_week !== $other->day_of_week) {
            return false;
        }

        // Zaman çakışması kontrolü
        $thisStart = strtotime($this->start_time);
        $thisEnd = strtotime($this->end_time);
        $otherStart = strtotime($other->start_time);
        $otherEnd = strtotime($other->end_time);

        return !($thisEnd <= $otherStart || $thisStart >= $otherEnd);
    }

    /**
     * Scope to get active duty schedules.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get duty schedules for a specific day.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $dayOfWeek
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeForDay($query, string $dayOfWeek)
    {
        return $query->where('day_of_week', $dayOfWeek);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'user_id',
            'campus_id',
            'education_level_id',
            'day_of_week',
            'start_time',
            'end_time',
            'location',
            'notes',
            'is_active',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return [];
    }
}
