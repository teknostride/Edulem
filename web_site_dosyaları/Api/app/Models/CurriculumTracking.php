<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CurriculumTracking extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $table = 'curriculum_tracking';

    protected $fillable = [
        'tenant_id',
        'lesson_id',
        'classroom_id',
        'teacher_id',
        'teaching_date',
        'topic',
        'topic_description',
        'lesson_hour',
        'notes',
        'materials',
        'activities',
        'is_completed',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'teaching_date' => 'date',
            'lesson_hour' => 'integer',
            'materials' => 'array',
            'activities' => 'array',
            'is_completed' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'lesson_id',
            'classroom_id',
            'teacher_id',
            'teaching_date',
            'topic',
            'lesson_hour',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['notes', 'topic_description'];
    }
}
