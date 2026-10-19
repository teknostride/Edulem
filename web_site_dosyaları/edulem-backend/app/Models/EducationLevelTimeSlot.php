<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EducationLevelTimeSlot extends Model
{
    use HasFactory;

	protected $fillable = [
		'tenant_id', 
		'education_level_id', 
		'slot_number', 
		'start_time', 
		'end_time', 
		'label', 
		'type', 
		'break_duration', 
		'is_active'
	];
	

    protected function casts(): array
    {
        return [
            'slot_number' => 'integer',
            'start_time' => 'string', 
            'end_time' => 'string',
            'break_duration' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the education level that owns the time slot.
     */
    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class);
    }
}
