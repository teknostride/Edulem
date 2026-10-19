<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Message;
use App\Models\ScheduledSms;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LayoutController extends ApiController
{
    /**
     * Tek istekte header/sidebar için gereken tüm badge ve özet verileri döner.
     * Header'daki 4 ayrı API çağrısını (unread-count, announcements, message-count, conversations) birleştirir.
     */
    public function init(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }

            $userId = (int) $user->id;
            $tenantId = (int) ($user->tenant_id ?? 0);

            // 1) Okunmamış duyuru sayısı
            $unreadAnnouncements = 0;
            if ($tenantId) {
                $qUnread = DB::table('announcements as a')
                    ->leftJoin('announcement_reads as ar', function ($j) use ($userId) {
                        $j->on('a.id', '=', 'ar.announcement_id')
                            ->where('ar.user_id', '=', $userId);
                    })
                    ->where('a.tenant_id', $tenantId)
                    ->where('a.status', 'published')
                    ->where(function ($q) {
                        $q->where(function($sq) {
                            $sq->whereNull('ar.is_deleted')->orWhere('ar.is_deleted', 0);
                        })->where(function($sq) {
                            $sq->whereNull('ar.is_trashed')->orWhere('ar.is_trashed', 0);
                        });
                    })
                    ->whereNull('ar.read_at');

                $roleId = $user->role_id ?? null;
                $roleName = null;
                try {
                    $roleName = $user->role->name ?? null;
                } catch (\Throwable $e) {
                    $roleName = null;
                }

                $qUnread->where(function ($q) use ($roleId, $roleName) {
                    $q->whereNull('a.target_roles');
                    if ($roleId) {
                        $q->orWhereJsonContains('a.target_roles', (int) $roleId);
                    }
                    if ($roleName) {
                        $q->orWhereJsonContains('a.target_roles', (string) $roleName);
                    }
                });
                $unreadAnnouncements = (int) $qUnread->count();
            }

            // 2) Son 5 duyuru (inbox) + okundu durumu
            $recentNotifications = [];
            if ($tenantId) {
                $qRecent = Announcement::query()
                    ->with('creator')
                    ->leftJoin('announcement_reads as ar', function ($j) use ($userId) {
                        $j->on('announcements.id', '=', 'ar.announcement_id')
                            ->where('ar.user_id', '=', $userId);
                    })
                    ->where('announcements.tenant_id', $tenantId)
                    ->where('announcements.status', 'published')
                    ->where(function ($query) {
                        $query->where(function($sq) {
                            $sq->whereNull('ar.is_deleted')->orWhere('ar.is_deleted', 0);
                        })->where(function($sq) {
                            $sq->whereNull('ar.is_trashed')->orWhere('ar.is_trashed', 0);
                        });
                    })
                    ->select('announcements.*', 'ar.read_at as user_read_at');

                $roleId = $user->role_id ?? null;
                $roleName = null;
                try {
                    $roleName = $user->role->name ?? null;
                } catch (\Throwable $e) {
                    $roleName = null;
                }

                $qRecent->where(function ($q) use ($roleId, $roleName) {
                    $q->whereNull('announcements.target_roles');
                    if ($roleId) {
                        $q->orWhereJsonContains('announcements.target_roles', (int) $roleId);
                    }
                    if ($roleName) {
                        $q->orWhereJsonContains('announcements.target_roles', (string) $roleName);
                    }
                });

                $recentNotifications = $qRecent
                    ->orderByDesc('announcements.created_at')
                    ->limit(5)
                    ->get()
                    ->map(function ($a) {
                        $creatorName = $a->creator
                            ? ($a->creator->name ?? $a->creator->email ?? 'Sistem')
                            : 'Sistem';
                        return [
                            'id' => $a->id,
                            'title' => $a->title,
                            'message' => $a->message,
                            'type' => $a->type,
                            'user_name' => $creatorName,
                            'user_avatar' => null,
                            'created_at' => $a->created_at?->toISOString(),
                            'read' => !empty($a->user_read_at),
                        ];
                    });
            }

            // 3) Okunmamış mesaj sayısı
            $unreadMessages = (int) Message::where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();

            // 4) Son 5 konuşma
            $recentConversations = [];
            $latest = Message::query()
                ->selectRaw('MAX(id) as last_message_id')
                ->selectRaw('CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id', [$userId])
                ->where(function ($q) use ($userId) {
                    $q->where('sender_id', $userId)->orWhere('receiver_id', $userId);
                })
                ->groupBy('other_user_id')
                ->orderByDesc('last_message_id')
                ->limit(5)
                ->get();

            if ($latest->isNotEmpty()) {
                $lastMessageIds = $latest->pluck('last_message_id')->filter()->values()->all();
                $lastMessages = Message::whereIn('id', $lastMessageIds)
                    ->with(['sender:id,first_name,last_name,email', 'receiver:id,first_name,last_name,email'])
                    ->get()
                    ->keyBy('id');

                $otherUserIds = $latest->pluck('other_user_id')->filter()->unique()->values()->all();
                $unreadCounts = Message::selectRaw('sender_id, COUNT(*) as cnt')
                    ->where('receiver_id', $userId)
                    ->where('is_read', false)
                    ->whereIn('sender_id', $otherUserIds)
                    ->groupBy('sender_id')
                    ->pluck('cnt', 'sender_id');

                foreach ($latest as $row) {
                    $msg = $lastMessages->get((int) $row->last_message_id);
                    if (!$msg) continue;

                    $other = (int) $msg->sender_id === $userId ? $msg->receiver : $msg->sender;
                    if (!$other) continue;

                    $displayName = trim(($other->first_name ?? '') . ' ' . ($other->last_name ?? '')) ?: ($other->email ?? 'Kullanıcı');
                    $recentConversations[] = [
                        'id' => (int) $row->other_user_id,
                        'user' => [
                            'id' => $other->id,
                            'first_name' => $other->first_name ?? '',
                            'last_name' => $other->last_name ?? '',
                            'email' => $other->email ?? '',
                            'avatar' => 'https://ui-avatars.com/api/?name=' . urlencode($displayName) . '&background=random',
                            'is_online' => false,
                        ],
                        'last_message' => [
                            'id' => $msg->id,
                            'content' => $msg->content,
                            'created_at' => $msg->created_at?->toISOString(),
                        ],
                        'unread_count' => (int) ($unreadCounts[$row->other_user_id] ?? 0),
                        'updated_at' => $msg->created_at?->toISOString(),
                    ];
                }
            }

            // Zamanı gelmiş bekleyen planlı SMS'ler varsa işle (Cron yoksa fallback)
            if ($tenantId) {
                $this->processDueScheduledSms($tenantId);
            }

            return $this->success([
                'unread_announcements' => $unreadAnnouncements,
                'recent_notifications' => $recentNotifications,
                'unread_messages' => $unreadMessages,
                'recent_conversations' => $recentConversations,
            ], 'Layout verileri başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Layout verileri getirilirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Zamanı gelmiş bekleyen planlı SMS'leri senkron olarak işler (fallback mekanizması).
     */
    private function processDueScheduledSms(int $tenantId): void
    {
        try {
            $nowTurkey = Carbon::now('Europe/Istanbul')->format('Y-m-d H:i:s');
            $dueSmsList = ScheduledSms::where('tenant_id', $tenantId)
                ->whereIn('status', ['pending', 'processing'])
                ->where('scheduled_at', '<=', $nowTurkey)
                ->limit(5)
                ->get();

            if ($dueSmsList->isNotEmpty()) {
                $smsCtrl = app(ScheduledSmsController::class);
                foreach ($dueSmsList as $dueSms) {
                    $smsCtrl->dispatchSmsSynchronously($dueSms);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('LayoutController SMS catch-up hatası: ' . $e->getMessage());
        }
    }
}
