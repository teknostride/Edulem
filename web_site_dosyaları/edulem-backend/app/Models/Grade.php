<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grade extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'exam_id',
        'teacher_id',
        'grade_type',
        'semester',
        'grade',
        'score',
        'answers',
        'question_topics',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'grade' => 'decimal:2',
            'score' => 'decimal:2',
            'answers' => 'array',
            'question_topics' => 'array',
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

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function topics(): HasMany
    {
        return $this->hasMany(GradeTopic::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(GradeAchievement::class);
    }

    /**
     * Check if grade is written exam.
     *
     * @return bool
     */
    public function isWritten(): bool
    {
        return $this->grade_type === 'written';
    }

    /**
     * Check if grade is oral exam.
     *
     * @return bool
     */
    public function isOral(): bool
    {
        return $this->grade_type === 'oral';
    }

    /**
     * Check if grade is first semester.
     *
     * @return bool
     */
    public function isFirstSemester(): bool
    {
        return $this->semester === 'first';
    }

    /**
     * Check if grade is second semester.
     *
     * @return bool
     */
    public function isSecondSemester(): bool
    {
        return $this->semester === 'second';
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
            'exam_id',
            'teacher_id',
            'grade_type',
            'semester',
            'grade',
            'score',
            'answers',
            'question_topics',
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
