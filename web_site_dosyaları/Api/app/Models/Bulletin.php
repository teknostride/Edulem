<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bulletin extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'template_id',
        'title',
        'content',
        'photo_ids',
        'teacher_comments',
        'achievements',
        'bulletin_date',
        'is_published_to_guardian',
        'is_added_to_portfolio',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'photo_ids' => 'array',
            'teacher_comments' => 'array',
            'achievements' => 'array',
            'bulletin_date' => 'date',
            'is_published_to_guardian' => 'boolean',
            'is_added_to_portfolio' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(BulletinTemplate::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if bulletin is published to guardian.
     *
     * @return bool
     */
    public function isPublishedToGuardian(): bool
    {
        return $this->is_published_to_guardian;
    }

    /**
     * Check if bulletin is added to portfolio.
     *
     * @return bool
     */
    public function isAddedToPortfolio(): bool
    {
        return $this->is_added_to_portfolio;
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'student_id',
            'template_id',
            'title',
            'bulletin_date',
            'is_published_to_guardian',
            'is_added_to_portfolio',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['content', 'teacher_comments', 'achievements'];
    }
}
