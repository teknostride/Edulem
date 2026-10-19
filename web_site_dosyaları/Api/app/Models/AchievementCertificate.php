<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AchievementCertificate extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'certificate_type',
        'title',
        'description',
        'achievement_date',
        'photo_ids',
        'file_id',
        'is_published_to_guardian',
        'is_added_to_portfolio',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'photo_ids' => 'array',
            'achievement_date' => 'date',
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

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if certificate is published to guardian.
     *
     * @return bool
     */
    public function isPublishedToGuardian(): bool
    {
        return $this->is_published_to_guardian;
    }

    /**
     * Check if certificate is added to portfolio.
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
            'certificate_type',
            'title',
            'achievement_date',
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
        return ['description'];
    }
}
