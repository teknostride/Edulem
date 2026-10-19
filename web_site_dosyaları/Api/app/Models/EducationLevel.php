<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\BelongsToTenant;

use App\Traits\BelongsToSeason;

class EducationLevel extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason;

    protected $fillable = [
        'tenant_id',   
        'campus_id',
        'season_id',
        'name',
        'code',
        'sort_order',
        'is_active'
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }
}