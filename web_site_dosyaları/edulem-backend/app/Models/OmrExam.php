<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OmrExam extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_exams';

    protected $fillable = [
        'tenant_id', 'name', 'exam_type', 'session', 'level', 'exam_date',
        'duration', 'season', 'test_code', 'wrong_penalty', 'omr_template_id',
        'status', 'share_roles', 'configured_at', 'merged_exam_ids', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'exam_date'    => 'date',
            'wrong_penalty' => 'float',
            'configured_at' => 'datetime',
            'merged_exam_ids' => 'array',
            'share_roles' => 'array',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(OmrTemplate::class, 'omr_template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function answerKeys(): HasMany
    {
        return $this->hasMany(OmrAnswerKey::class, 'exam_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(OmrResult::class, 'exam_id');
    }

    public function examCourses(): HasMany
    {
        return $this->hasMany(OmrExamCourse::class, 'exam_id');
    }
}
