<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Homework extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $table = 'homeworks';

    protected $fillable = [
        'tenant_id',
        'lesson_id',
        'classroom_id',
        'assignment_mode',
        'teacher_id',
        'title',
        'description',
        'due_date',
        'file_id',
        'is_active',
        'is_checked',
        'is_online',
        'question_ids',
        'is_project',
        'project_topics',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'assignment_mode' => 'string',
            'is_active' => 'boolean',
            'is_checked' => 'boolean',
            'is_online' => 'boolean',
            'question_ids' => 'array',
            'is_project' => 'boolean',
            'project_topics' => 'array',
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

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(HomeworkSubmission::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(HomeworkStudentAssignment::class);
    }

    public function assignedStudents(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'homework_student_assignments')
            ->withPivot(['tenant_id', 'review_status', 'teacher_note', 'reviewed_by', 'reviewed_at'])
            ->withTimestamps();
    }

    /**
     * Check if homework is online.
     *
     * @return bool
     */
    public function isOnline(): bool
    {
        return $this->is_online === true;
    }

    /**
     * Check if homework is project.
     *
     * @return bool
     */
    public function isProject(): bool
    {
        return $this->is_project === true;
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
            'assignment_mode',
            'teacher_id',
            'title',
            'description',
            'due_date',
            'is_active',
            'is_online',
            'question_ids',
            'is_project',
            'project_topics',
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
