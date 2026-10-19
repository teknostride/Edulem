<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasurementTrialImport extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'trial_id',
        'booklet_id',
        'file_path',
        'original_name',
        'status',
        'summary',
        'errors',
        'imported_by',
        'imported_at',
    ];

    protected function casts(): array
    {
        return [
            'summary' => 'array',
            'errors' => 'array',
            'imported_at' => 'datetime',
        ];
    }

    public function trial(): BelongsTo
    {
        return $this->belongsTo(MeasurementTrial::class, 'trial_id');
    }

    public function booklet(): BelongsTo
    {
        return $this->belongsTo(MeasurementTrialBooklet::class, 'booklet_id');
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
