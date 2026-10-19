<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CounselingNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'counselor_id',
        'title',
        'content',
        'tags',
        'is_private',
    ];

    protected $casts = [
        'tags' => 'json',
        'is_private' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function counselor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counselor_id');
    }

    public function scopePublic($query)
    {
        return $query->where('is_private', false);
    }

    public function scopePrivate($query)
    {
        return $query->where('is_private', true);
    }

    public function scopeByStudent($query, $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    public function scopeByCounselor($query, $counselorId)
    {
        return $query->where('counselor_id', $counselorId);
    }

    public function scopeByTag($query, $tag)
    {
        return $query->whereJsonContains('tags', $tag);
    }

    public function getFormattedTagsAttribute(): array
    {
        return $this->tags ?? [];
    }

    public function hasTags(): bool
    {
        return !empty($this->tags);
    }

    public function getTagCountAttribute(): int
    {
        return count($this->tags ?? []);
    }
}
