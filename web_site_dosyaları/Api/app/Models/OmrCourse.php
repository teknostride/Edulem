<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OmrCourse extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_courses';

    protected $fillable = [
        'tenant_id', 'name', 'code', 'coefficients', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'coefficients' => 'array',
            'is_active'    => 'boolean',
        ];
    }

    public function topics(): HasMany
    {
        return $this->hasMany(OmrTopic::class, 'course_id');
    }

    public function answerKeys(): HasMany
    {
        return $this->hasMany(OmrAnswerKey::class, 'course_id');
    }

    public function examCourses(): HasMany
    {
        return $this->hasMany(OmrExamCourse::class, 'course_id');
    }
}
