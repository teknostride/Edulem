<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'lesson_id',
        'classroom_id',
        'exam_date',
        'duration_minutes',
        'total_points',
        'type',
        'is_optical_form',
        'optical_form_file_id',
        'optical_form_status',
        'optical_form_notes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'exam_date' => 'datetime',
            'duration_minutes' => 'integer',
            'total_points' => 'integer',
            'is_optical_form' => 'boolean',
            'is_active' => 'boolean',
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

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function opticalFormFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'optical_form_file_id');
    }

    public function scoreCoefficients(): HasMany
    {
        return $this->hasMany(ExamScoreCoefficient::class);
    }

    public function topics(): HasMany
    {
        return $this->hasMany(ExamTopic::class);
    }

    public function examClassrooms(): HasMany
    {
        return $this->hasMany(ExamClassroom::class);
    }

    /**
     * Check if exam uses optical form.
     *
     * @return bool
     */
    public function isOpticalForm(): bool
    {
        return $this->is_optical_form === true;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'name',
            'description',
            'lesson_id',
            'classroom_id',
            'exam_date',
            'duration_minutes',
            'total_points',
            'type',
            'is_optical_form',
            'optical_form_file_id',
            'optical_form_status',
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
        return [];
    }
}
