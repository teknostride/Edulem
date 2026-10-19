<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class StaffAssignment extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'assignment_type',
        'assigned_staff_ids',
        'team_leader_id',
        'start_date',
        'end_date',
        'deadline',
        'completion_percentage',
        'status',
        'related_data',
        'notes',
        'show_in_calendar',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'assigned_staff_ids' => 'array',
            'related_data' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'deadline' => 'date',
            'completion_percentage' => 'integer',
            'show_in_calendar' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function teamLeader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'team_leader_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get assigned staff users.
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function assignedStaff()
    {
        return User::whereIn('id', $this->assigned_staff_ids ?? [])->get();
    }

    /**
     * Check if assignment is pending.
     *
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if assignment is in progress.
     *
     * @return bool
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    /**
     * Check if assignment is completed.
     *
     * @return bool
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if assignment is overdue.
     *
     * @return bool
     */
    public function isOverdue(): bool
    {
        if (!$this->deadline) {
            return false;
        }

        return Carbon::now() > $this->deadline && !$this->isCompleted();
    }

    /**
     * Check if assignment is active (between start and end date).
     *
     * @return bool
     */
    public function isActive(): bool
    {
        $now = Carbon::now();
        return $now >= $this->start_date && $now <= $this->end_date;
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
            'assignment_type',
            'start_date',
            'end_date',
            'deadline',
            'completion_percentage',
            'status',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['description', 'notes', 'related_data'];
    }
}
