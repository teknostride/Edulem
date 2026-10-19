<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ImpersonationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     *
     * @param  \App\Models\User  $impersonator
     * @param  bool  $started
     */
    public function __construct(
        public User $impersonator,
        public bool $started = true
    ) {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->started 
                ? 'Destek Oturumu Başlatıldı' 
                : 'Destek Oturumu Sonlandırıldı',
            'message' => $this->started
                ? "{$this->impersonator->name} adına oturum açıldı."
                : "Destek oturumu sonlandırıldı.",
            'type' => 'warning',
            'data' => [
                'impersonator_id' => $this->impersonator->id,
                'impersonator_name' => $this->impersonator->name,
                'started' => $this->started,
            ],
            'created_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     *
     * @return \Illuminate\Notifications\Messages\BroadcastMessage
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'title' => $this->started 
                ? 'Destek Oturumu Başlatıldı' 
                : 'Destek Oturumu Sonlandırıldı',
            'message' => $this->started
                ? "{$this->impersonator->name} adına oturum açıldı."
                : "Destek oturumu sonlandırıldı.",
            'type' => 'warning',
            'data' => [
                'impersonator_id' => $this->impersonator->id,
                'impersonator_name' => $this->impersonator->name,
                'started' => $this->started,
            ],
        ]);
    }
}
