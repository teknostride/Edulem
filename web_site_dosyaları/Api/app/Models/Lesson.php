<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    /**
     * Toplu atamaya (Mass Assignment) izin verilen alanlar.
     * Buraya 'color' ve 'is_active' eklemezsek, veritabanına kayıt gitmez!
     */
    protected $fillable = [
        'tenant_id',
        'campus_id',
        'education_level_id',
        'name',
        'code',
        'description',
        'color',      // <-- YENİ EKLENDİ
        'is_active',  // <-- YENİ EKLENDİ
    ];

    /**
     * Veri tipi dönüşümleri.
     * Veritabanında 0/1 (tinyint) olan alanı, kod tarafında true/false olarak kullanmamızı sağlar.
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }

    /**
     * Dersi veren öğretmenler.
     */
    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'lesson_teacher', 'lesson_id', 'teacher_id')
            ->withTimestamps();
    }

    public function educationLevel(): BelongsTo
    {
        return $this->belongsTo(EducationLevel::class);
    }

    public function educationLevels(): BelongsToMany
    {
        return $this->belongsToMany(EducationLevel::class, 'education_level_lessons', 'lesson_id', 'education_level_id')
            ->withTimestamps();
    }

    /**
     * Loglanacak özellikleri belirtir.
     * Yapılan değişiklikleri (Loggable trait'i sayesinde) takip etmek için buraya da ekledik.
     */
    public function getLoggableAttributes(): array
    {
        return ['campus_id', 'education_level_id', 'name', 'code', 'description', 'color', 'is_active'];
    }

    public function getHiddenFromLogs(): array
    {
        return [];
    }
}