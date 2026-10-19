<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends ApiController
{
    /**
     * Get user notifications.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }

            $query = DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->orderBy('created_at', 'desc');

            if ($request->has('unread') && $request->boolean('unread')) {
                $query->whereNull('read_at');
            }

            $perPage = (int) $request->get('per_page', 15);
            $paginator = $query->paginate($perPage);

            $formatted = collect($paginator->items())->map(function ($item) {
                $payload = json_decode($item->data ?? '{}', true) ?: [];
                return [
                    'id' => (string) $item->id,
                    'type' => $item->type ?? 'general',
                    'data' => [
                        'title' => $payload['title'] ?? 'Bildirim',
                        'message' => $payload['message'] ?? '',
                        'extra' => $payload['extra'] ?? [],
                    ],
                    'read_at' => $item->read_at,
                    'created_at' => $item->created_at,
                ];
            });

            $unreadCount = DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->count();

            return $this->success([
                'data' => $formatted,
                'unread_count' => $unreadCount,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ], 'Bildirimler başarıyla getirildi.');
        } catch (\Throwable $e) {
            return $this->error('Bildirimler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get unread notifications count (Genel bildirimler + Mesajlar toplamı).
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->success(['unread_count' => 0]);
            }

            $unreadNotifications = DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->count();

            $unreadMessages = Message::where('receiver_id', $user->id)
                ->where('is_read', false)
                ->count();

            $totalUnread = $unreadNotifications + $unreadMessages;

            return $this->success([
                'unread_count' => $totalUnread,
                'unread_notifications' => $unreadNotifications,
                'unread_messages' => $unreadMessages,
            ], 'Okunmamış bildirim sayısı getirildi.');
        } catch (\Throwable $e) {
            return $this->error('Okunmamış bildirim sayısı getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->update(['read_at' => now(), 'updated_at' => now()]);

            return $this->success([], 'Bildirim okundu olarak işaretlendi.');
        } catch (\Throwable $e) {
            return $this->error('Bildirim güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now(), 'updated_at' => now()]);

            return $this->success([], 'Tüm bildirimler okundu olarak işaretlendi.');
        } catch (\Throwable $e) {
            return $this->error('Bildirimler güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete notification.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $user = $request->user();
            DB::table('notifications')
                ->where('id', $id)
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $user->id)
                ->delete();

            return $this->success([], 'Bildirim silindi.');
        } catch (\Throwable $e) {
            return $this->error('Bildirim silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
