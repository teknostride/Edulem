<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\BelongsToSeason;

class Classroom extends Model
{
    use HasFactory, BelongsToTenant, BelongsToSeason, Loggable;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'campus_id',
        'education_level_id',
        'name',
        'code',
        'capacity',
        'teacher_id',
        'grade_level',
        'season_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'grade_level' => 'string',
            'is_active' => 'boolean',
        ];
    }

    // --- İLİŞKİLER ---

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    // 👇 İŞTE BU EKSİKTİ! GERİ GELDİ 👇
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    // 👇 AZ ÖNCE EKLEDİĞİMİZ KADEME İLİŞKİSİ 👇
    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class, 'grade_level');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    // --- LOGLAMA AYARLARI ---

    public function getLoggableAttributes(): array
    {
        return ['name', 'code', 'capacity', 'teacher_id', 'grade_level', 'is_active'];
    }

    public function getHiddenFromLogs(): array
    {
        return [];
    }
}