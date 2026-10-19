<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class QuestionBank extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'question_text',
        'question_image_url',
        'question_type',
        'options',
        'correct_answer',
        'correct_answers',
        'explanation',
        'question_bank_topic_id',
        'lesson_id',
        'difficulty_level',
        'estimated_time_minutes',
        'points',
        'school_type',
        'grade_level',
        'tags',
        'related_question_ids',
        'usage_count',
        'last_used_at',
        'is_active',
        'is_public',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answers' => 'array',
            'tags' => 'array',
            'related_question_ids' => 'array',
            'last_used_at' => 'date',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
            'estimated_time_minutes' => 'integer',
            'points' => 'integer',
            'grade_level' => 'integer',
            'usage_count' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(QuestionBankTopic::class, 'question_bank_topic_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function usageHistory(): HasMany
    {
        return $this->hasMany(QuestionBankUsageHistory::class);
    }

    /**
     * Check if question is active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Check if question is public.
     *
     * @return bool
     */
    public function isPublic(): bool
    {
        return $this->is_public;
    }

    /**
     * Check if question has been used recently.
     *
     * @param int $days
     * @return bool
     */
    public function hasBeenUsedRecently(int $days = 30): bool
    {
        if (!$this->last_used_at) {
            return false;
        }

        return $this->last_used_at->diffInDays(Carbon::now()) <= $days;
    }

    /**
     * Increment usage count and update last used date.
     *
     * @param string $usageType
     * @param int|null $relatedId
     * @return void
     */
    public function recordUsage(string $usageType, ?int $relatedId = null): void
    {
        $this->increment('usage_count');
        $this->update(['last_used_at' => Carbon::now()]);

        // Usage history kaydı
        QuestionBankUsageHistory::create([
            'tenant_id' => $this->tenant_id,
            'question_bank_id' => $this->id,
            'usage_type' => $usageType,
            'related_id' => $relatedId,
            'used_at' => Carbon::now(),
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'question_text',
            'question_type',
            'difficulty_level',
            'points',
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
        return ['correct_answer', 'correct_answers', 'explanation'];
    }
}
