<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScholarshipExamEntryTemplate extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'scholarship_exam_id',
        'name',
        'school_name',
        'exam_address',
        'selected_grade_levels',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'selected_grade_levels' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scholarshipExam(): BelongsTo
    {
        return $this->belongsTo(ScholarshipExam::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getLoggableAttributes(): array
    {
        return [
            'scholarship_exam_id',
            'name',
            'is_active',
        ];
    }

    public function getHiddenFromLogs(): array
    {
        return ['exam_address', 'selected_grade_levels'];
    }
}
