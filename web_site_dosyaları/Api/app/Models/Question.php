<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'guardian_id',
        'subject',
        'message',
        'audio_file_id',
        'status',
        'assigned_to',
        'response',
        'responded_by',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'responded_at' => 'datetime',
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

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function respondedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    public function audioFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'audio_file_id');
    }

    /**
     * Check if question has audio file.
     *
     * @return bool
     */
    public function hasAudio(): bool
    {
        return $this->audio_file_id !== null;
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
            'guardian_id',
            'subject',
            'message',
            'audio_file_id',
            'status',
            'assigned_to',
            'response',
            'responded_by',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return [];
    }
}
