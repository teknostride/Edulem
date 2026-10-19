<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OmrSession extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_sessions';

    protected $fillable = [
        'tenant_id', 'name', 'exam_type', 'exam_date', 'exam_ids',
        'combined_results', 'calculated_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'exam_ids'         => 'array',
            'combined_results' => 'array',
            'exam_date'        => 'date',
            'calculated_at'    => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function exams()
    {
        return OmrExam::whereIn('id', $this->exam_ids ?? [])->get();
    }
}
