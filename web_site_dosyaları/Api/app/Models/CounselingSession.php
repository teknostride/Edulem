<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CounselingSession extends Model
{
    use HasFactory, BelongsToSeason;

    protected $fillable = [
        'counseling_student_id',
        'counselor_id',
        'notes',
        'type',
        'session_date',
        'session_time',
        'duration_minutes',
        'status',
        'counselor_notes',
        'student_feedback',
        'fee',
        'is_paid',
        'location',
    ];

    protected $casts = [
        'session_date' => 'date',
        'session_time' => 'datetime:H:i:s',
        'duration_minutes' => 'integer',
        'is_paid' => 'boolean',
    ];

    protected $dates = [
        'session_date',
        'created_at',
        'updated_at',
    ];

    public function counselingStudent(): BelongsTo
    {
        return $this->belongsTo(CounselingStudent::class, 'counseling_student_id');
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function scopeByStudent($query, $studentId)
    {
        return $query->whereHas('counselingStudent', function ($q) use ($studentId) {
            $q->where('student_id', $studentId);
        });
    }

    public function scopeByCounselor($query, $counselorId)
    {
        return $query->where('counselor_id', $counselorId);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('session_date', '>=', now());
    }

    public function scopePast($query)
    {
        return $query->where('session_date', '<', now());
    }

    public function scopeRequiresFollowUp($query)
    {
        return $query;
    }

    public function getFormattedDurationAttribute(): string
    {
        return $this->duration_minutes . ' dakika';
    }

    public function getTypeTextAttribute(): string
    {
        return match($this->type) {
            'individual' => 'Bireysel',
            'group' => 'Grup',
            'parent' => 'Veli',
            default => 'Bilinmeyen',
        };
    }

    public function isOverdue(): bool
    {
        return $this->status === 'scheduled' && $this->session_date && $this->session_date->lt(now()->startOfDay());
    }
}
