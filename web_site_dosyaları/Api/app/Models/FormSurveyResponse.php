<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormSurveyResponse extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'form_survey_id',
        'respondent_id',
        'respondent_type',
        'answers',
        'notes',
        'is_anonymous',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'is_anonymous' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function formSurvey(): BelongsTo
    {
        return $this->belongsTo(FormSurvey::class);
    }

    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondent_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if response is anonymous.
     *
     * @return bool
     */
    public function isAnonymous(): bool
    {
        return $this->is_anonymous;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'form_survey_id',
            'respondent_type',
            'is_anonymous',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['answers', 'notes'];
    }
}
