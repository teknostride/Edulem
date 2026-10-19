<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class OnlineExam extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'lesson_id',
        'classroom_id',
        'exam_id',
        'question_ids',
        'question_count',
        'duration_minutes',
        'total_points',
        'scoring_formula',
        'points_per_question',
        'negative_points',
        'start_time',
        'end_time',
        'single_attempt',
        'allow_retake',
        'max_attempts',
        'auto_submit',
        'show_results_immediately',
        'show_correct_answers',
        'shuffle_questions',
        'shuffle_options',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'question_ids' => 'array',
            'question_count' => 'integer',
            'duration_minutes' => 'integer',
            'total_points' => 'decimal:2',
            'points_per_question' => 'decimal:2',
            'negative_points' => 'decimal:2',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'single_attempt' => 'boolean',
            'allow_retake' => 'boolean',
            'max_attempts' => 'integer',
            'auto_submit' => 'boolean',
            'show_results_immediately' => 'boolean',
            'show_correct_answers' => 'boolean',
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
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

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(OnlineExamAttempt::class);
    }

    /**
     * Check if exam is currently active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        $now = Carbon::now();
        return $this->status === 'active' 
            && $this->start_time <= $now 
            && $this->end_time >= $now;
    }

    /**
     * Check if exam is published.
     *
     * @return bool
     */
    public function isPublished(): bool
    {
        return in_array($this->status, ['published', 'active']);
    }

    /**
     * Check if exam has started.
     *
     * @return bool
     */
    public function hasStarted(): bool
    {
        return Carbon::now() >= $this->start_time;
    }

    /**
     * Check if exam has ended.
     *
     * @return bool
     */
    public function hasEnded(): bool
    {
        return Carbon::now() > $this->end_time;
    }

    /**
     * Get student attempt count.
     *
     * @param int $studentId
     * @return int
     */
    public function getStudentAttemptCount(int $studentId): int
    {
        return $this->attempts()
            ->where('student_id', $studentId)
            ->whereIn('status', ['submitted', 'expired'])
            ->count();
    }

    /**
     * Check if student can take exam.
     *
     * @param int $studentId
     * @return bool
     */
    public function canStudentTakeExam(int $studentId): bool
    {
        if (!$this->isPublished()) {
            return false;
        }

        if (!$this->hasStarted()) {
            return false;
        }

        if ($this->hasEnded()) {
            return false;
        }

        if ($this->single_attempt) {
            $existingAttempt = $this->attempts()
                ->where('student_id', $studentId)
                ->whereIn('status', ['in_progress', 'submitted'])
                ->first();
            
            if ($existingAttempt) {
                return false;
            }
        }

        if (!$this->allow_retake) {
            $attemptCount = $this->getStudentAttemptCount($studentId);
            if ($attemptCount >= $this->max_attempts) {
                return false;
            }
        }

        return true;
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
            'lesson_id',
            'classroom_id',
            'question_count',
            'duration_minutes',
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
        return ['description', 'question_ids'];
    }
}
