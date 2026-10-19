<?php

namespace App\Models;

use App\Traits\BelongsToSeason;
use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Schedule extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    protected $fillable = [
        'tenant_id',
        'classroom_id',
        'lesson_id',
        'teacher_id',
        'assistant_teacher_ids',
        'day_of_week',
        'start_time',
        'end_time',
        'room',
        'remote_link',
        'program_type',
        'program_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'assistant_teacher_ids' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get assistant teachers (yardımcı öğretmenler).
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function assistantTeachers()
    {
        if (empty($this->assistant_teacher_ids)) {
            return collect([]);
        }

        return User::whereIn('id', $this->assistant_teacher_ids)->get();
    }

    /**
     * Check if schedule has remote link.
     *
     * @return bool
     */
    public function hasRemoteLink(): bool
    {
        return !empty($this->remote_link);
    }

    /**
     * Check if schedule is double program.
     *
     * @return bool
     */
    public function isDoubleProgram(): bool
    {
        return $this->program_type === 'double';
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Scope a query to only include schedules where the user is primary or assistant teacher.
     */
    public function scopeForTeacher(Builder $query, int|string $teacherId): Builder
    {
        $tid = (int) $teacherId;
        return $query->where(function ($q) use ($tid) {
            $q->where('teacher_id', $tid)
              ->orWhereJsonContains('assistant_teacher_ids', $tid)
              ->orWhereJsonContains('assistant_teacher_ids', (string) $tid)
              ->orWhereRaw("FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(assistant_teacher_ids, ''), '[', ''), ']', ''), '\"', ''), ' ', ''))", [$tid])
              ->orWhere('assistant_teacher_ids', 'like', '%"' . $tid . '"%')
              ->orWhere('assistant_teacher_ids', 'like', '%[' . $tid . ',%')
              ->orWhere('assistant_teacher_ids', 'like', '%,' . $tid . ',%')
              ->orWhere('assistant_teacher_ids', 'like', '%,' . $tid . ']%')
              ->orWhere('assistant_teacher_ids', 'like', '%[' . $tid . ']%')
              ->orWhere('assistant_teacher_ids', 'like', '% ' . $tid . ',%')
              ->orWhere('assistant_teacher_ids', 'like', '% ' . $tid . ']%');
        });
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'classroom_id',
            'lesson_id',
            'teacher_id',
            'assistant_teacher_ids',
            'day_of_week',
            'start_time',
            'end_time',
            'room',
            'remote_link',
            'program_type',
            'program_id',
            'notes',
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
