<?php

namespace App\Models;

use App\Traits\BelongsToSeason;
use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TutoringSession extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason, Loggable;

    protected $fillable = [
        'tenant_id',
        'season_id',
        'teacher_id',
        'lesson_id',
        'type',
        'title',
        'date',
        'start_time',
        'end_time',
        'duration',
        'room',
        'remote_link',
        'max_students',
        'weekly_max_count',
        'homework_id',
        'notes',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'duration' => 'integer',
            'max_students' => 'integer',
            'weekly_max_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function homework(): BelongsTo
    {
        return $this->belongsTo(Homework::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'tutoring_session_students')
            ->withTimestamps();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(TutoringSessionAttendance::class);
    }

    /**
     * Check if session has remote link.
     *
     * @return bool
     */
    public function hasRemoteLink(): bool
    {
        return !empty($this->remote_link);
    }

    /**
     * Check if session is full (max students reached).
     *
     * @return bool
     */
    public function isFull(): bool
    {
        if (!$this->max_students) {
            return false;
        }

        return $this->students()->count() >= $this->max_students;
    }

    /**
     * Get available spots.
     *
     * @return int|null
     */
    public function getAvailableSpots(): ?int
    {
        if (!$this->max_students) {
            return null;
        }

        return max(0, $this->max_students - $this->students()->count());
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'type',
            'title',
            'date',
            'start_time',
            'end_time',
            'duration',
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
        return ['notes'];
    }
}
