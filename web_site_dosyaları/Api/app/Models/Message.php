<?php

namespace App\Models;

use App\Traits\BelongsToSeason;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Message extends Model
{
    use HasFactory, BelongsToSeason;

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'content',
        'is_read',
        'read_at',
        'deleted_by_sender',
        'deleted_by_receiver',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'deleted_by_sender' => 'boolean',
        'deleted_by_receiver' => 'boolean',
    ];

    protected $dates = [
        'read_at',
        'created_at',
        'updated_at',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    /** Alias for recipient(); MessageController uses "receiver" in with() and $message->receiver. */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeBetweenUsers($query, $userId1, $userId2)
    {
        return $query->where(function ($q) use ($userId1, $userId2) {
            $q->where(function ($subQuery) use ($userId1, $userId2) {
                $subQuery->where('sender_id', $userId1)
                    ->where('receiver_id', $userId2);
            })->orWhere(function ($subQuery) use ($userId1, $userId2) {
                $subQuery->where('sender_id', $userId2)
                    ->where('receiver_id', $userId1);
            });
        });
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('receiver_id', $userId)
            ->orWhere('sender_id', $userId);
    }

    public function markAsRead(): bool
    {
        if ($this->is_read) {
            return true;
        }

        $this->is_read = true;
        $this->read_at = now();
        $this->save();

        return true;
    }
}
