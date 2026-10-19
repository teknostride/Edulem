<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OmrTopic extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_topics';

    protected $fillable = [
        'tenant_id', 'course_id', 'name', 'type', 'sort_order',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(OmrCourse::class, 'course_id');
    }
}
