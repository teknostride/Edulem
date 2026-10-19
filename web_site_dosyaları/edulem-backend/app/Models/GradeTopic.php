<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeTopic extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'grade_id',
        'topic_name',
        'question_number',
        'question_count',
        'points',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'question_number' => 'integer',
            'question_count' => 'integer',
            'points' => 'decimal:2',
            'sort_order' => 'integer',
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

    public function achievements(): HasMany
    {
        return $this->hasMany(GradeAchievement::class, 'topic_id');
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
            'topic_name',
            'question_number',
            'question_count',
            'points',
            'sort_order',
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
