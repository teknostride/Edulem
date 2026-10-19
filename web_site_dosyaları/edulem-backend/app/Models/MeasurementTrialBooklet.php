<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeasurementTrialBooklet extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'trial_id',
        'name',
        'question_count',
        'answer_key',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'answer_key' => 'array',
            'question_count' => 'integer',
        ];
    }

    public function trial(): BelongsTo
    {
        return $this->belongsTo(MeasurementTrial::class, 'trial_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function results(): HasMany
    {
        return $this->hasMany(MeasurementTrialResult::class, 'booklet_id');
    }
}
