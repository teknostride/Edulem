<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class OnlineExamAttempt extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'online_exam_id',
        'student_id',
        'started_at',
        'submitted_at',
        'expires_at',
        'time_spent_seconds',
        'answered_count',
        'correct_count',
        'wrong_count',
        'empty_count',
        'score',
        'percentage',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'expires_at' => 'datetime',
            'time_spent_seconds' => 'integer',
            'answered_count' => 'integer',
            'correct_count' => 'integer',
            'wrong_count' => 'integer',
            'empty_count' => 'integer',
            'score' => 'decimal:2',
            'percentage' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function onlineExam(): BelongsTo
    {
        return $this->belongsTo(OnlineExam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(OnlineExamAnswer::class);
    }

    /**
     * Check if attempt is expired.
     *
     * @return bool
     */
    public function isExpired(): bool
    {
        return Carbon::now() > $this->expires_at;
    }

    /**
     * Check if attempt is in progress.
     *
     * @return bool
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress' && !$this->isExpired();
    }

    /**
     * Get remaining time in seconds.
     *
     * @return int
     */
    public function getRemainingTimeSeconds(): int
    {
        $remaining = Carbon::now()->diffInSeconds($this->expires_at, false);
        return max(0, $remaining);
    }

    /**
     * Get remaining time formatted.
     *
     * @return string
     */
    public function getRemainingTimeFormatted(): string
    {
        $seconds = $this->getRemainingTimeSeconds();
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $secs);
    }

    /**
     * Calculate and update score.
     *
     * @return void
     */
    public function calculateScore(): void
    {
        $exam = $this->onlineExam;
        $answers = $this->answers;

        $correctCount = $answers->where('is_correct', true)->count();
        $wrongCount = $answers->where('is_correct', false)->whereNotNull('answer')->count();
        $emptyCount = $answers->whereNull('answer')->count();

        $this->correct_count = $correctCount;
        $this->wrong_count = $wrongCount;
        $this->empty_count = $emptyCount;
        $this->answered_count = $correctCount + $wrongCount;

        // Puan hesaplama
        $score = 0;
        if ($exam->points_per_question) {
            $score = ($correctCount * $exam->points_per_question) - ($wrongCount * $exam->negative_points);
        } else {
            // Toplam puanı soru sayısına böl
            $pointsPerQuestion = $exam->total_points / $exam->question_count;
            $score = ($correctCount * $pointsPerQuestion) - ($wrongCount * $exam->negative_points);
        }

        $this->score = max(0, $score);
        $this->percentage = $exam->total_points > 0 
            ? ($this->score / $exam->total_points) * 100 
            : 0;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'online_exam_id',
            'student_id',
            'status',
            'score',
            'percentage',
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
