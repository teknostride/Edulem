<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'name',
        'phone',
        'email',
        'appointment_date',
        'notes',
        'status',
        'assigned_to',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'datetime',
            'status' => 'string',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function guidanceNotes(): HasMany
    {
        return $this->hasMany(GuidanceNote::class);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return ['lead_id', 'name', 'phone', 'email', 'appointment_date', 'notes', 'status', 'assigned_to'];
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
