<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScholarshipDocumentTemplate extends Model
{
    use HasFactory, BelongsToTenant, Loggable, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'exam_entry_date',
        'exam_entry_time',
        'school_name',
        'exam_address',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'exam_entry_date' => 'date:Y-m-d',
            'exam_entry_time' => 'string',
            'notes' => 'string',
        ];
    }

    public function classrooms(): BelongsToMany
    {
        return $this->belongsToMany(
            Classroom::class,
            'scholarship_document_template_classroom',
            'template_id',
            'classroom_id'
        )->withTimestamps();
    }

    public function getLoggableAttributes(): array
    {
        return [
            'name',
            'exam_entry_date',
            'exam_entry_time',
            'school_name',
        ];
    }

    public function getHiddenFromLogs(): array
    {
        return ['exam_address'];
    }
}
