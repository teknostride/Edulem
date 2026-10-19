<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionBankUsageHistory extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'question_bank_id',
        'usage_type',
        'related_id',
        'used_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'used_at' => 'date',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function questionBank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'question_bank_id',
            'usage_type',
            'related_id',
            'used_at',
        ];
    }
}
