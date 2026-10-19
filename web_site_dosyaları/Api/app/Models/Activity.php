<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Activity extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'category',
        'activity_date',
        'activity_time',
        'location',
        'share_type',
        'target_student_ids',
        'classroom_id',
        'photo_file_ids',
        'video_file_ids',
        'document_file_ids',
        'is_published',
        'requires_admin_approval',
        'is_admin_approved',
        'approved_by',
        'approved_at',
        'view_count',
        'like_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'activity_date' => 'date',
            'activity_time' => 'string',
            'target_student_ids' => 'array',
            'photo_file_ids' => 'array',
            'video_file_ids' => 'array',
            'document_file_ids' => 'array',
            'is_published' => 'boolean',
            'requires_admin_approval' => 'boolean',
            'is_admin_approved' => 'boolean',
            'approved_at' => 'datetime',
            'view_count' => 'integer',
            'like_count' => 'integer',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ActivityParticipant::class);
    }

    /**
     * Get student participants.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function studentParticipants(): HasMany
    {
        return $this->participants()->whereNotNull('student_id');
    }

    /**
     * Get user participants (teachers/staff).
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function userParticipants(): HasMany
    {
        return $this->participants()->whereNotNull('user_id');
    }

    /**
     * Check if activity is published.
     *
     * @return bool
     */
    public function isPublished(): bool
    {
        return $this->is_published && (!$this->requires_admin_approval || $this->is_admin_approved);
    }

    /**
     * Check if activity requires approval.
     *
     * @return bool
     */
    public function requiresApproval(): bool
    {
        return $this->requires_admin_approval && !$this->is_admin_approved;
    }

    /**
     * Increment view count.
     *
     * @return void
     */
    public function incrementViewCount(): void
    {
        $this->increment('view_count');
    }

    /**
     * Increment like count.
     *
     * @return void
     */
    public function incrementLikeCount(): void
    {
        $this->increment('like_count');
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
            'category',
            'activity_date',
            'share_type',
            'is_published',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['description'];
    }
}
