<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OmrExamCourse extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_exam_courses';

    protected $fillable = [
        'tenant_id', 'exam_id', 'course_id', 'coefficient', 'question_count', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'coefficient' => 'float',
            'question_count' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(OmrExam::class, 'exam_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(OmrCourse::class, 'course_id');
    }
}
