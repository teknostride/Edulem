<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OmrAnswerKey extends Model
{
    protected $table = 'omr_answer_keys';

    protected $fillable = [
        'exam_id',
        'course_id',
        'booklet_type',
        'question_no',
        'booklet_a_qno',
        'booklet_b_qno',
        'booklet_c_qno',
        'booklet_d_qno',
        'correct_answer',
        'topic_id',
    ];

    protected function casts(): array
    {
        return [
            'question_no' => 'integer',
            'booklet_a_qno' => 'integer',
            'booklet_b_qno' => 'integer',
            'booklet_c_qno' => 'integer',
            'booklet_d_qno' => 'integer',
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

    public function topic(): BelongsTo
    {
        return $this->belongsTo(OmrTopic::class, 'topic_id');
    }

    public function topicObjective(): BelongsTo
    {
        return $this->topic();
    }
}
