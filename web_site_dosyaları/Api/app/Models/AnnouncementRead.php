<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementRead extends Model
{
    protected $fillable = ['announcement_id', 'user_id', 'read_at', 'is_starred', 'is_important', 'is_trashed', 'is_deleted'];

    protected $casts = [
        'read_at' => 'datetime',
        'is_starred' => 'boolean',
        'is_important' => 'boolean',
        'is_trashed' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
