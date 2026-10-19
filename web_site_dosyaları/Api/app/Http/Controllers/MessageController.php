<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MessageController extends ApiController
{
    /**
     * Kullanıcının konuşmalarını getirir (WhatsApp mantığı).
     * Son mesaj tarihine göre üstten alta sıralı; mesajı olanlar üstte.
     * Mesajı olmayan kullanıcılar frontend'de /users ile alınıp en altta listelenir.
     */
    public function getConversations(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }
            $userId = $user->id;

            // 1. Adım: Her bir konuşma için en son mesajın ID'sini bulalım.
            // Bu sorgu 'Strict Mode' hatalarını önlemek için sadece ID döner.
            $latestMessageIds = Message::query()
				->select(DB::raw('MAX(id) as id'))
				->where(function ($q) use ($userId) {
					// deleted_by_sender ve deleted_by_receiver kısımlarını sildik
					$q->where('sender_id', $userId)
					  ->orWhere('receiver_id', $userId);
				})
				->groupBy(DB::raw("CASE WHEN sender_id = $userId THEN receiver_id ELSE sender_id END"))
				->pluck('id');

            if ($latestMessageIds->isEmpty()) {
                return $this->success([
                    'conversations' => [],
                    'current_user_id' => $userId,
                ], 'Henüz bir konuşma bulunmuyor.');
            }

            // 2. Adım: Bu ID'lere sahip mesajları tüm ilişkileriyle (sender, receiver) birlikte çekelim.
            $lastMessages = Message::with(['sender', 'receiver'])
                ->whereIn('id', $latestMessageIds)
                ->orderBy('id', 'desc')
                ->get();

            // 3. Adım: Okunmamış mesaj sayılarını tek bir sorguda alalım (Performans için).
            $unreadCounts = Message::query()
                ->selectRaw('sender_id, COUNT(*) as cnt')
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->groupBy('sender_id')
                ->pluck('cnt', 'sender_id');

            $conversations = [];

            foreach ($lastMessages as $message) {
                // Konuşulan diğer kullanıcıyı belirle
                $otherUser = ($message->sender_id == $userId) ? $message->receiver : $message->sender;

                // Eğer kullanıcı silinmişse veya bulunamıyorsa atla
                if (!$otherUser) continue;

                $displayName = trim(($otherUser->first_name ?? '') . ' ' . ($otherUser->last_name ?? '')) ?: ($otherUser->email ?? 'Kullanıcı');

                $conversations[] = [
                    'id' => $otherUser->id,
                    'user' => [
                        'id' => $otherUser->id,
                        'first_name' => $otherUser->first_name ?? '',
                        'last_name' => $otherUser->last_name ?? '',
                        'email' => $otherUser->email ?? '',
                        'avatar' => 'https://ui-avatars.com/api/?name=' . urlencode($displayName) . '&background=random',
                        'is_online' => false, // İsteğe bağlı: Online sistemi varsa buraya entegre edilebilir
                    ],
                    'last_message' => [
                        'id' => $message->id,
                        'sender_id' => $message->sender_id,
                        'receiver_id' => $message->receiver_id,
                        'content' => $message->content,
                        'created_at' => $message->created_at->toISOString(),
                        'is_read' => $message->is_read,
                    ],
                    'unread_count' => (int) ($unreadCounts[$otherUser->id] ?? 0),
                    'updated_at' => $message->created_at->toISOString(),
                ];
            }

            return $this->success([
                'conversations' => $conversations,
                'current_user_id' => $userId,
            ], 'Konuşmalar başarıyla getirildi.');

        } catch (\Exception $e) {
            // Hatayı loglara kaydetmek hata ayıklamayı kolaylaştırır
            \Log::error("Mesajlaşma Hatası: " . $e->getMessage());
            return $this->error('Konuşmalar getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get messages between two users
     */

    public function getMessages(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user->id;
            $otherUserId = $request->get('user_id');

            if (!$otherUserId) {
                return $this->error('Kullanıcı ID zorunludur.', [], 400);
            }

            $messages = Message::where(function ($query) use ($userId, $otherUserId) {
                // Sadece sender ve receiver kontrolü yapıyoruz, silinme sütunlarını kaldırdık
                $query->where(function ($subQuery) use ($userId, $otherUserId) {
                    $subQuery->where('sender_id', $userId)
                        ->where('receiver_id', $otherUserId);
                })->orWhere(function ($subQuery) use ($userId, $otherUserId) {
                    $subQuery->where('sender_id', $otherUserId)
                        ->where('receiver_id', $userId);
                });
            })
            ->with(['sender', 'receiver'])
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'sender_id' => $message->sender_id,
                    'receiver_id' => $message->receiver_id,
                    'content' => $message->content,
                    'created_at' => $message->created_at->toISOString(),
                    'is_read' => $message->is_read,
                ];
            });

            // Okunmamış mesajları "okundu" olarak işaretle
            Message::where('sender_id', $otherUserId)
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->update(['is_read' => true, 'read_at' => now()]);

            return $this->success($messages->toArray(), 'Mesajlar başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Mesajlar getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Send a new message
     */
    public function sendMessage(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'receiver_id' => 'required|exists:users,id',
                'content' => 'required|string|max:1000',
            ]);

            $user = $request->user();
            $content = $request->input('content');
            $receiverId = (int) $request->input('receiver_id');

            $message = Message::create([
                'sender_id' => $user->id,
                'receiver_id' => $receiverId,
                'content' => $content,
                'is_read' => false,
            ]);

            $message->load(['sender', 'receiver']);

            // Alıcıya anlık push bildirimi ve rozet güncellemesi gönder
            try {
                $senderName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: ($user->name ?? 'Mesaj');
                app(\App\Services\FcmService::class)->sendToUser(
                    $receiverId,
                    $senderName,
                    \Illuminate\Support\Str::limit($content, 120),
                    [
                        'type' => 'message',
                        'conversationId' => (string) $user->id,
                        'messageId' => (string) $message->id,
                        'route' => '/messages/' . $user->id,
                    ]
                );
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Mesaj push bildirimi gönderilemedi: ' . $e->getMessage());
            }

            return $this->success([
                'id' => $message->id,
                'sender_id' => $message->sender_id,
                'receiver_id' => $message->receiver_id,
                'content' => $message->content,
                'created_at' => $message->created_at->toISOString(),
                'is_read' => $message->is_read,
            ], 'Mesaj başarıyla gönderildi.');
        } catch (\Exception $e) {
            return $this->error('Mesaj gönderilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get unread message count
     */
    public function getUnreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $unreadCount = Message::where('receiver_id', $user->id)
                ->where('is_read', false)
                ->count();

            return $this->success(['unread_count' => $unreadCount], 'Okunmamış mesaj sayısı getirildi.');
        } catch (\Exception $e) {
            return $this->error('Okunmamış mesaj sayısı getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $message = Message::where('id', $id)
                ->where('receiver_id', $user->id)
                ->firstOrFail();

            $message->markAsRead();

            return $this->success([], 'Mesaj okundu olarak işaretlendi.');
        } catch (\Exception $e) {
            return $this->error('Mesaj işaretlenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Kullanıcı kendi tarafındaki bir mesajı silebilir.
     */
    public function deleteMessage(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }

            $message = Message::find($id);
            if (!$message) {
                return $this->error('Mesaj bulunamadı.', [], 404);
            }

            // Mesajın sahibi veya alıcısı mı kontrol et
            if ((int) $message->sender_id === (int) $user->id || (int) $message->receiver_id === (int) $user->id) {
                $message->delete(); // Mesajı veritabanından tamamen siler
                return $this->success([], 'Mesaj başarıyla silindi.');
            } else {
                return $this->error('Bu mesajı silme yetkiniz yok.', [], 403);
            }

        } catch (\Exception $e) {
            return $this->error('Mesaj silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Kullanıcı belirli bir kişi ile olan tüm sohbeti sadece kendi tarafından siler.
     */
    public function deleteConversation(Request $request, $otherUserId): JsonResponse
    {
        try {
            $user = $request->user();
            $userId = $user->id;

            // Bu iki kullanıcı arasındaki TÜM mesajları bul ve veritabanından sil
            Message::where(function ($query) use ($userId, $otherUserId) {
                $query->where('sender_id', $userId)->where('receiver_id', $otherUserId);
            })->orWhere(function ($query) use ($userId, $otherUserId) {
                $query->where('sender_id', $otherUserId)->where('receiver_id', $userId);
            })->delete();

            return $this->success([], 'Sohbet başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Sohbet silinirken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
