<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeasurementTrial extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason, Loggable;

    protected $fillable = [
        'tenant_id',
        'season_id',
        'name',
        'description',
        'exam_date',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'exam_date' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function booklets(): HasMany
    {
        return $this->hasMany(MeasurementTrialBooklet::class, 'trial_id');
    }

    public function imports(): HasMany
    {
        return $this->hasMany(MeasurementTrialImport::class, 'trial_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(MeasurementTrialResult::class, 'trial_id');
    }
}
