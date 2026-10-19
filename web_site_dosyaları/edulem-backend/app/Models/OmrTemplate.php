<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OmrTemplate extends Model
{
    use BelongsToTenant;

    protected $table = 'omr_templates';

    protected $fillable = [
        'tenant_id', 'name', 'exam_type', 'field_rules', 'notes', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'field_rules' => 'array',
            'is_active'   => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(OmrExam::class, 'omr_template_id');
    }
}
