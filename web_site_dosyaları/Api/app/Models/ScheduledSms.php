<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledSms extends Model
{
    use HasFactory, BelongsToTenant, Loggable;

    protected $table = 'scheduled_sms';

    protected $fillable = [
        'tenant_id',
        'title',
        'message',
        'recipient_phones',
        'recipient_type',
        'recipient_ids',
        'scheduled_at',
        'status',
        'sent_at',
        'error_message',
        'sent_count',
        'failed_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'recipient_phones' => 'array',
            'recipient_ids' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
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

    public function reports(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SmsReport::class, 'sender_id')
            ->whereIn('sender_type', ['scheduled_sms', 'test_sms']);
    }

    /**
     * Check if SMS is ready to be sent.
     *
     * @return bool
     */
    public function isReadyToSend(): bool
    {
        return $this->status === 'pending' 
            && $this->scheduled_at <= now();
    }

    /**
     * Mark as processing.
     *
     * @return void
     */
    public function markAsProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    /**
     * Mark as sent.
     *
     * @param  int  $sentCount
     * @param  int  $failedCount
     * @return void
     */
    public function markAsSent(int $sentCount = 0, int $failedCount = 0): void
    {
        $this->update([
            'status' => 'completed',
            'sent_at' => now(),
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
        ]);
    }

    /**
     * Mark as failed.
     *
     * @param  string  $errorMessage
     * @return void
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
        ]);
    }

    /**
     * Get the attributes that should be logged.
     *
     * @return array
     */
    public function getLoggableAttributes(): array
    {
        return [
            'title',
            'message',
            'recipient_type',
            'scheduled_at',
            'status',
        ];
    }

    /**
     * Get the attributes that should be hidden from logs.
     *
     * @return array
     */
    public function getHiddenFromLogs(): array
    {
        return ['recipient_phones', 'recipient_ids'];
    }

    /**
     * Check if a phone number is a valid mobile phone number and return normalized version.
     * Returns normalized phone (e.g. 905XXXXXXXXX) if valid, null if invalid.
     */
    public static function validateAndNormalizePhone(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        $cleaned = preg_replace('/\D/', '', (string) $phone);

        // 10 hane: 5XXXXXXXXX -> 905XXXXXXXXX
        if (strlen($cleaned) === 10 && str_starts_with($cleaned, '5')) {
            return '90' . $cleaned;
        }

        // 11 hane: 05XXXXXXXXX -> 905XXXXXXXXX
        if (strlen($cleaned) === 11 && str_starts_with($cleaned, '05')) {
            return '9' . $cleaned;
        }

        // 12 hane: 905XXXXXXXXX -> 905XXXXXXXXX
        if (strlen($cleaned) === 12 && str_starts_with($cleaned, '905')) {
            return $cleaned;
        }

        // Uluslararası numara kontrolü (E.164 standardı: Türkiye dışı geçerli ülke kodları, 11-15 hane arası)
        if (strlen($cleaned) >= 11 && strlen($cleaned) <= 15 && !str_starts_with($cleaned, '90') && !str_starts_with($cleaned, '0') && !str_starts_with($cleaned, '5')) {
            return $cleaned;
        }

        return null;
    }
}
