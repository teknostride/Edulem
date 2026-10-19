<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeAchievement extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'grade_id',
        'topic_id',
        'achievement_code',
        'achievement_name',
        'question_count',
        'correct_count',
        'wrong_count',
        'score',
        'success_rate',
    ];

    protected function casts(): array
    {
        return [
            'question_count' => 'integer',
            'correct_count' => 'integer',
            'wrong_count' => 'integer',
            'score' => 'decimal:2',
            'success_rate' => 'decimal:2',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(Grade::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(GradeTopic::class, 'topic_id');
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'grade_id',
            'topic_id',
            'achievement_code',
            'achievement_name',
            'question_count',
            'correct_count',
            'wrong_count',
            'score',
            'success_rate',
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
