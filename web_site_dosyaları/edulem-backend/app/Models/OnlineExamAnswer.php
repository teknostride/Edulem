<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnlineExamAnswer extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'online_exam_attempt_id',
        'online_exam_id',
        'student_id',
        'question_id',
        'question_order',
        'answer',
        'correct_answer',
        'is_correct',
        'points_earned',
        'time_spent_seconds',
        'answered_at',
    ];

    protected function casts(): array
    {
        return [
            'question_order' => 'integer',
            'answer' => 'string',
            'correct_answer' => 'string',
            'is_correct' => 'boolean',
            'points_earned' => 'decimal:2',
            'time_spent_seconds' => 'integer',
            'answered_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function onlineExamAttempt(): BelongsTo
    {
        return $this->belongsTo(OnlineExamAttempt::class);
    }

    public function onlineExam(): BelongsTo
    {
        return $this->belongsTo(OnlineExam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'online_exam_attempt_id',
            'question_id',
            'is_correct',
            'points_earned',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['answer', 'correct_answer'];
    }
}
