<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CounselingStudent extends Model
{
    use HasFactory, BelongsToSeason;

    protected $fillable = [
        'student_id',
        'counselor_id',
        'parent_name',
        'parent_phone',
        'status',
        'issues',
        'notes',
        'last_session_date',
        'session_count',
    ];

    protected $casts = [
        'issues' => 'json',
        'status' => 'string',
        'last_session_date' => 'date',
        'session_count' => 'integer',
    ];

    protected $dates = [
        'last_session_date',
        'created_at',
        'updated_at',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(CounselingSession::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(CounselingNote::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeByCounselor($query, $counselorId)
    {
        return $query->where('counselor_id', $counselorId);
    }

    public function incrementSessionCount(): void
    {
        $this->increment('session_count');
        $this->update(['last_session_date' => now()]);
    }

    public function hasIssues(): bool
    {
        return !empty($this->issues);
    }

    public function getIssueCountAttribute(): int
    {
        return count($this->issues ?? []);
    }

    public function getFormattedIssuesAttribute(): array
    {
        return $this->issues ?? [];
    }
}
