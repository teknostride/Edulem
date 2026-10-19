<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class OnlineSurvey extends Model
{
    use HasFactory, BelongsToTenant, Loggable, BelongsToSeason;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'target_audience',
        'start_date',
        'end_date',
        'is_active',
        'allow_anonymous',
        'show_results',
        'is_required',
        'question_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'target_audience' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
            'allow_anonymous' => 'boolean',
            'show_results' => 'boolean',
            'is_required' => 'boolean',
            'question_count' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(OnlineSurveyQuestion::class)->orderBy('order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(OnlineSurveyResponse::class);
    }

    /**
     * Check if survey is active.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        $now = Carbon::now();
        return $this->is_active 
            && $this->start_date <= $now 
            && $this->end_date >= $now;
    }

    /**
     * Check if survey has started.
     *
     * @return bool
     */
    public function hasStarted(): bool
    {
        return Carbon::now() >= $this->start_date;
    }

    /**
     * Check if survey has ended.
     *
     * @return bool
     */
    public function hasEnded(): bool
    {
        return Carbon::now() > $this->end_date;
    }

    /**
     * Get total responses count.
     *
     * @return int
     */
    public function getTotalResponses(): int
    {
        return $this->responses()->count();
    }

    /**
     * Check if user has responded.
     *
     * @param int|null $userId
     * @return bool
     */
    public function hasUserResponded(?int $userId): bool
    {
        if (!$userId) {
            return false;
        }

        return $this->responses()
            ->where('respondent_id', $userId)
            ->exists();
    }

    /**
     * Check if a student/guardian (portal user) has responded.
     * Portal users don't have respondent_id in users table, so we check by respondent_type.
     *
     * @return bool
     */
    public function hasStudentResponded(): bool
    {
        return $this->responses()
            ->whereIn('respondent_type', ['student', 'guardian'])
            ->exists();
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
            'start_date',
            'end_date',
            'is_active',
            'is_required',
            'question_count',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['description', 'target_audience'];
    }
}
