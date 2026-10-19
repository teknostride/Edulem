<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'schedule_id',
        'teacher_id',
        'date',
        'status',
        'is_administrative_leave',
        'administrative_leave_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'status' => 'string',
            'is_administrative_leave' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    /**
     * Check if attendance is administrative leave.
     *
     * @return bool
     */
    public function isAdministrativeLeave(): bool
    {
        return $this->is_administrative_leave === true;
    }

    public function getLoggableAttributes(): array
    {
        return [
            'student_id',
            'schedule_id',
            'teacher_id',
            'date',
            'status',
            'is_administrative_leave',
            'administrative_leave_reason',
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
