<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasurementTrialResult extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'trial_id',
        'student_id',
        'booklet_id',
        'correct',
        'wrong',
        'blank',
        'net',
        'raw_answers',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'correct' => 'integer',
            'wrong' => 'integer',
            'blank' => 'integer',
            'net' => 'decimal:2',
            'raw_answers' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function trial(): BelongsTo
    {
        return $this->belongsTo(MeasurementTrial::class, 'trial_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function booklet(): BelongsTo
    {
        return $this->belongsTo(MeasurementTrialBooklet::class, 'booklet_id');
    }
}
