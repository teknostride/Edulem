<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsBlacklist extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $table = 'sms_blacklist';

    protected $fillable = [
        'tenant_id',
        'phone',
        'reason',
        'type',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => 'string',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if a phone number is blacklisted for a tenant.
     *
     * @param  string  $phone
     * @param  int  $tenantId
     * @return bool
     */
    public static function isBlacklisted(string $phone, int $tenantId): bool
    {
        return self::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->exists();
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'phone',
            'reason',
            'type',
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
