<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class GuidanceNote extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'counselor_id',
        'appointment_id',
        'title',
        'content',
        'type',
        'note_date',
        'note_time',
        'is_visible_to_guardian',
        'is_confidential',
        'requires_admin_review',
        'is_admin_approved',
        'approved_by',
        'approved_at',
        'tags',
        'attachments',
        'follow_up_notes',
        'follow_up_date',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
            'note_time' => 'string',
            'is_visible_to_guardian' => 'boolean',
            'is_confidential' => 'boolean',
            'requires_admin_review' => 'boolean',
            'is_admin_approved' => 'boolean',
            'approved_at' => 'datetime',
            'tags' => 'array',
            'attachments' => 'array',
            'follow_up_date' => 'date',
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

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if note is visible to guardian.
     *
     * @return bool
     */
    public function isVisibleToGuardian(): bool
    {
        return $this->is_visible_to_guardian && !$this->is_confidential;
    }

    /**
     * Check if note requires admin review.
     *
     * @return bool
     */
    public function requiresReview(): bool
    {
        return $this->requires_admin_review && !$this->is_admin_approved;
    }

    /**
     * Check if note is approved.
     *
     * @return bool
     */
    public function isApproved(): bool
    {
        return $this->is_admin_approved;
    }

    /**
     * Check if note is confidential.
     *
     * @return bool
     */
    public function isConfidential(): bool
    {
        return $this->is_confidential;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'student_id',
            'counselor_id',
            'type',
            'note_date',
            'is_confidential',
            'requires_admin_review',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['content', 'follow_up_notes'];
    }
}
