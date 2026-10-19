<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\BelongsToSeason;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OmrResult extends Model
{
    use BelongsToTenant, BelongsToSeason;

    protected $table = 'omr_results';

    protected $fillable = [
        'tenant_id', 'season_id', 'exam_id', 'student_id', 'student_no', 'booklet_type',
        'raw_answers', 'parsed_fields', 'course_scores', 'total_net', 'total_point',
        'rank', 'import_batch_id', 'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'raw_answers'    => 'array',
            'parsed_fields'  => 'array',
            'course_scores'  => 'array',
            'total_net'      => 'float',
            'total_point'    => 'float',
            'calculated_at'  => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(OmrExam::class, 'exam_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }
}
