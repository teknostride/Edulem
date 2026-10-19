<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamClassroom extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'exam_id',
        'classroom_id',
        'student_count',
        'capacity',
        'order',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'student_count' => 'integer',
            'capacity' => 'integer',
            'order' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(ExamClassroomStudent::class);
    }

    /**
     * Get available capacity.
     *
     * @return int
     */
    public function getAvailableCapacity(): int
    {
        $used = $this->students()->count();
        return max(0, ($this->capacity ?? $this->classroom->capacity) - $used);
    }

    /**
     * Check if classroom is full.
     *
     * @return bool
     */
    public function isFull(): bool
    {
        return $this->getAvailableCapacity() === 0;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'exam_id',
            'classroom_id',
            'student_count',
            'capacity',
            'order',
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
