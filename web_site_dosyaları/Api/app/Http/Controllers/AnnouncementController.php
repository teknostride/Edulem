<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends ApiController
{
    /**
     * Kullanıcı görünen adı: name veya email
     */
    private function userDisplayName($user): string
    {
        if (!$user) {
            return 'Sistem';
        }
        return $user->name ?? $user->email ?? 'Sistem';
    }

    /**
     * Zamanı gelen planlanmış duyuruları (scheduled_at <= now) yayınla.
     * Cron/scheduler yoksa bile; index veya unread-count çağrıldığında çalışır.
     */
    private function publishDueScheduledAnnouncements(?int $tenantId = null): void
    {
        $q = Announcement::where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now());

        if ($tenantId) {
            $q->where('tenant_id', $tenantId);
        }

        $q->update(['status' => 'published']);
    }

    private function canManageAnnouncement($user, Announcement $announcement): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_superadmin)) {
            return true;
        }

        if ($announcement->created_by == $user->id) {
            return true;
        }

        $roleName = strtolower($user->role?->name ?? '');
        $managerRoles = ['owner', 'admin', 'genel müdür', 'kurucu', 'müdür', 'müdür yardımcısı', 'kampüs müdürü', 'öğrenci işleri', 'student_affairs'];

        return in_array($roleName, $managerRoles, true);
    }

    private function applyTargetRoleFilter($query, $user): void
    {
        $roleId = $user->role_id ?? null;
        $roleName = null;
        try {
            $roleName = $user->role->name ?? null;
        } catch (\Throwable $e) {
            $roleName = null;
        }

        $query->where(function ($q) use ($roleId, $roleName) {
            $q->whereNull('announcements.target_roles');
            if ($roleId) {
                $q->orWhereJsonContains('announcements.target_roles', (int) $roleId);
            }
            if ($roleName) {
                $q->orWhereJsonContains('announcements.target_roles', (string) $roleName);
            }
        });
    }

    /**
     * Sayfalı duyuru listesi (veritabanı)
     * mailbox: inbox, sent, starred, scheduled, drafts, important, trash
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? (object) ['id' => 1, 'tenant_id' => 1];
            $userId = $user->id;
            $tenantId = $user->tenant_id ?? null;
            if (!$tenantId) {
                return response()->json(['status' => true, 'data' => [], 'message' => 'Duyurular başarıyla getirildi.', 'meta' => ['current_page' => 1, 'last_page' => 1, 'per_page' => 15, 'total' => 0]], 200);
            }

            $this->publishDueScheduledAnnouncements((int) $tenantId);

            $mailbox = $request->get('mailbox', 'inbox');
            $q = Announcement::query()
                ->with('creator')
                ->where('tenant_id', $tenantId)
                ->leftJoin('announcement_reads as ar_u', function ($j) use ($userId) {
                    $j->on('announcements.id', '=', 'ar_u.announcement_id')->where('ar_u.user_id', '=', $userId);
                })
                ->select('announcements.*', 'ar_u.read_at as user_read_at', 'ar_u.is_starred as is_starred', 'ar_u.is_important as is_important', 'ar_u.is_trashed as is_trashed', 'ar_u.is_deleted as is_deleted');

            $q->where(function ($query) {
                $query->whereNull('ar_u.is_deleted')->orWhere('ar_u.is_deleted', 0);
            });

            switch ($mailbox) {
                case 'sent':
                    $q->where('announcements.status', 'published')->where('announcements.created_by', $userId)
                      ->where(function($sq) { $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                    break;
                case 'starred':
                    $q->where('announcements.status', 'published')->where('ar_u.is_starred', 1)
                      ->where(function($sq) { $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                    $this->applyTargetRoleFilter($q, $user);
                    break;
                case 'scheduled':
                    $q->where('announcements.status', 'scheduled')->where('announcements.created_by', $userId);
                    break;
                case 'drafts':
                    $q->where('announcements.status', 'draft')->where('announcements.created_by', $userId);
                    break;
                case 'important':
                    $q->where('announcements.status', 'published')->where('ar_u.is_important', 1)
                      ->where(function($sq) { $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                    $this->applyTargetRoleFilter($q, $user);
                    break;
                case 'trash':
                    $q->where('ar_u.is_trashed', 1);
                    break;
                default: // inbox
                    $q->where('announcements.status', 'published')
                      ->where(function($sq) { $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                    $this->applyTargetRoleFilter($q, $user);
                    break;
            }

            if ($request->filled('type') && $request->get('type') !== 'all') {
                $q->where('announcements.type', $request->get('type'));
            }
            if ($request->filled('search')) {
                $s = '%' . $request->get('search') . '%';
                $q->where(function ($q2) use ($s) {
                    $q2->where('announcements.title', 'like', $s)
                        ->orWhere('announcements.message', 'like', $s)
                        ->orWhereHas('creator', fn ($c) => $c->where('first_name', 'like', $s)->orWhere('last_name', 'like', $s)->orWhere('email', 'like', $s));
                });
            }

            $paginator = $q->orderBy('announcements.created_at', 'desc')->paginate((int) $request->get('per_page', 15));

            $isOwnerOrAdmin = !empty($user->is_superadmin) || in_array(strtolower($user->role?->name ?? ''), [
                'owner', 'admin', 'genel müdür', 'kurucu', 'müdür', 'müdür yardımcısı', 'kampüs müdürü', 'öğrenci işleri', 'student_affairs'
            ], true);

            $data = collect($paginator->items())->map(function ($a) use ($userId, $isOwnerOrAdmin) {
                $isCreator = ($a->created_by == $userId);
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'message' => $a->message,
                    'type' => $a->type,
                    'status' => $a->status,
                    'created_by' => $a->created_by,
                    'target_roles' => $a->target_roles ?? [],
                    'user_name' => $this->userDisplayName($a->creator),
                    'created_at' => $a->created_at?->toISOString(),
                    'scheduled_at' => $a->scheduled_at?->toISOString(),
                    'read' => ! empty($a->user_read_at),
                    'is_starred' => (bool) ($a->is_starred ?? false),
                    'is_important' => (bool) ($a->is_important ?? false),
                    'can_edit' => $isCreator || $isOwnerOrAdmin,
                    'can_delete' => $isCreator || $isOwnerOrAdmin,
                ];
            })->all();

            return response()->json([
                'status' => true,
                'data' => $data,
                'message' => 'Duyurular başarıyla getirildi.',
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            return $this->error('Duyurular getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mailbox sayıları: unread, starred, sent, scheduled, drafts, important, trash
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? (object) ['id' => 1, 'tenant_id' => 1];
            $tenantId = $user->tenant_id ?? null;
            $userId = $user->id;
            if (!$tenantId) {
                return response()->json([
                    'status' => true,
                    'data' => [
                        'unread_count' => 0,
                        'starred_count' => 0,
                        'sent_count' => 0,
                        'scheduled_count' => 0,
                        'drafts_count' => 0,
                        'important_count' => 0,
                        'trash_count' => 0,
                    ],
                    'message' => 'Mailbox sayıları getirildi.',
                ], 200);
            }

            $tenantId = (int) $tenantId;
            $this->publishDueScheduledAnnouncements($tenantId);

            $roleId = $user->role_id ?? null;
            $roleName = null;
            try {
                $roleName = $user->role->name ?? null;
            } catch (\Throwable $e) {
                $roleName = null;
            }

            $row = DB::table('announcements as a')
                ->leftJoin('announcement_reads as ar', function ($j) use ($userId) {
                    $j->on('a.id', '=', 'ar.announcement_id')
                        ->where('ar.user_id', '=', $userId);
                })
                ->where('a.tenant_id', $tenantId)
                ->where(function ($q) use ($roleId, $roleName) {
                    $q->whereNull('a.target_roles');
                    if ($roleId) {
                        $q->orWhereJsonContains('a.target_roles', (int) $roleId);
                    }
                    if ($roleName) {
                        $q->orWhereJsonContains('a.target_roles', (string) $roleName);
                    }
                })
                ->where(function ($q) {
                    $q->where(function($sq) {
                        $sq->whereNull('ar.is_deleted')->orWhere('ar.is_deleted', 0);
                    })->where(function($sq) {
                        $sq->whereNull('ar.is_trashed')->orWhere('ar.is_trashed', 0);
                    });
                })
                ->selectRaw("SUM(CASE WHEN a.status = 'published' AND (ar.read_at IS NULL) THEN 1 ELSE 0 END) as unread_count")
                ->selectRaw("SUM(CASE WHEN a.status = 'published' AND ar.is_starred = 1 THEN 1 ELSE 0 END) as starred_count")
                ->selectRaw("SUM(CASE WHEN a.status = 'published' AND a.created_by = ? THEN 1 ELSE 0 END) as sent_count", [$userId])
                ->selectRaw("SUM(CASE WHEN a.status = 'scheduled' AND a.created_by = ? THEN 1 ELSE 0 END) as scheduled_count", [$userId])
                ->selectRaw("SUM(CASE WHEN a.status = 'draft' AND a.created_by = ? THEN 1 ELSE 0 END) as drafts_count", [$userId])
                ->selectRaw("SUM(CASE WHEN a.status = 'published' AND ar.is_important = 1 THEN 1 ELSE 0 END) as important_count")
                ->selectRaw("SUM(CASE WHEN ar.is_trashed = 1 AND (ar.is_deleted IS NULL OR ar.is_deleted = 0) THEN 1 ELSE 0 END) as trash_count")
                ->first();

            $data = [
                'unread_count' => (int) ($row->unread_count ?? 0),
                'starred_count' => (int) ($row->starred_count ?? 0),
                'sent_count' => (int) ($row->sent_count ?? 0),
                'scheduled_count' => (int) ($row->scheduled_count ?? 0),
                'drafts_count' => (int) ($row->drafts_count ?? 0),
                'important_count' => (int) ($row->important_count ?? 0),
                'trash_count' => (int) ($row->trash_count ?? 0),
            ];
            return response()->json(['status' => true, 'data' => $data, ...$data, 'message' => 'Mailbox sayıları getirildi.'], 200);
        } catch (\Exception $e) {
            return $this->error('Mailbox sayıları getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'title' => 'required|string|max:255',
                'message' => 'required|string',
                'type' => 'nullable|string|in:info,success,warning,error',
                'roles' => 'nullable|array',
                'roles.*' => 'nullable',
                'status' => 'nullable|string|in:draft,published,scheduled',
                'scheduled_at' => 'required_if:status,scheduled|nullable|date|after:now',
            ]);

            $rawRoles = $request->input('roles', null);
            $targetRoles = null;
            if (is_array($rawRoles)) {
                $allowedStrings = ['student', 'Öğrenci'];
                $targetRoles = [];
                foreach ($rawRoles as $r) {
                    if (is_int($r) || (is_string($r) && ctype_digit($r))) {
                        $targetRoles[] = (int) $r;
                        continue;
                    }
                    if (is_string($r) && in_array($r, $allowedStrings, true)) {
                        $targetRoles[] = $r;
                    }
                }
                $targetRoles = array_values(array_unique($targetRoles));
            }

            $user = $request->user();
            if (!$user->tenant_id) {
                return $this->error('Duyuru oluşturmak için kurum bilgisi gerekli.', [], 400);
            }

            $a = Announcement::create([
                'tenant_id' => $user->tenant_id,
                'title' => $request->title,
                'message' => $request->message,
                'type' => $request->get('type', 'info'),
                'created_by' => $user->id,
                'target_roles' => $targetRoles,
                'status' => $request->get('status', 'published'),
                'scheduled_at' => $request->get('scheduled_at'),
            ]);

            // Hedef kitleye anlık push bildirimi gönder
            try {
                if ($a->status === 'published') {
                    $fcm = app(\App\Services\FcmService::class);
                    $annTitle = "Yeni Duyuru: " . $a->title;
                    $annBody = \Illuminate\Support\Str::limit(strip_tags($a->message), 120);
                    $annData = [
                        'type' => 'announcement',
                        'announcementId' => (string) $a->id,
                        'route' => '/announcements/' . $a->id,
                    ];

                    // Personel/Öğretmen hedefleri
                    $targetUserQuery = \App\Models\User::where('tenant_id', $user->tenant_id)->where('is_active', true);
                    if (!empty($targetRoles)) {
                        $roleIds = array_filter($targetRoles, 'is_numeric');
                        if (!empty($roleIds)) {
                            $targetUserQuery->whereIn('role_id', $roleIds);
                        }
                    }
                    $targetUserIds = $targetUserQuery->pluck('id')->toArray();
                    if (!empty($targetUserIds)) {
                        $fcm->sendToUsers($targetUserIds, $annTitle, $annBody, $annData);
                    }

                    // Öğrenci hedefleri (Eğer roller boşsa veya 'student'/'Öğrenci' içeriyorsa)
                    $includeStudents = empty($targetRoles) || in_array('student', (array) $targetRoles, true) || in_array('Öğrenci', (array) $targetRoles, true);
                    if ($includeStudents) {
                        $studentIds = \App\Models\Student::where('tenant_id', $user->tenant_id)->where('is_active', true)->pluck('id')->toArray();
                        if (!empty($studentIds)) {
                            $fcm->sendToStudents($studentIds, $annTitle, $annBody, $annData);
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Duyuru push bildirimi gönderilemedi: ' . $e->getMessage());
            }

            return $this->success([
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'user_name' => $this->userDisplayName($user),
                'created_at' => $a->created_at?->toISOString(),
                'read' => false,
            ], 'Duyuru başarıyla gönderildi.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Geçersiz veri.', $e->errors(), 422);
        } catch (\Exception $e) {
            return $this->error('Duyuru gönderilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $a = Announcement::with('creator')->where('tenant_id', $user->tenant_id)->findOrFail($id);
            $read = (bool) $a->reads()->where('user_id', $user->id)->whereNotNull('read_at')->exists();

            $isOwnerOrAdmin = !empty($user->is_superadmin) || in_array(strtolower($user->role?->name ?? ''), [
                'owner', 'admin', 'genel müdür', 'kurucu', 'müdür', 'müdür yardımcısı', 'kampüs müdürü', 'öğrenci işleri', 'student_affairs'
            ], true);
            $isCreator = ($a->created_by == $user->id);

            return $this->success([
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'status' => $a->status,
                'created_by' => $a->created_by,
                'target_roles' => $a->target_roles ?? [],
                'user_name' => $this->userDisplayName($a->creator),
                'created_at' => $a->created_at?->toISOString(),
                'scheduled_at' => $a->scheduled_at?->toISOString(),
                'read' => $read,
                'can_edit' => $isCreator || $isOwnerOrAdmin,
                'can_delete' => $isCreator || $isOwnerOrAdmin,
            ], 'Duyuru getirildi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Duyuru getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Yetkisiz işlem.', [], 401);
            }
            $a = Announcement::where('tenant_id', $user->tenant_id)->findOrFail($id);

            if (!$this->canManageAnnouncement($user, $a)) {
                return $this->error('Bu duyuruyu düzenleme yetkiniz bulunmamaktadır.', [], 403);
            }

            $request->validate([
                'title' => 'required|string|max:255',
                'message' => 'required|string',
                'type' => 'nullable|string|in:info,success,warning,error',
                'roles' => 'nullable|array',
                'roles.*' => 'nullable',
                'scheduled_at' => 'nullable|date',
            ]);

            $targetRoles = $a->target_roles;
            if ($request->has('roles')) {
                $rawRoles = $request->input('roles', null);
                if (is_array($rawRoles)) {
                    $allowedStrings = ['student', 'Öğrenci'];
                    $targetRoles = [];
                    foreach ($rawRoles as $r) {
                        if (is_int($r) || (is_string($r) && ctype_digit($r))) {
                            $targetRoles[] = (int) $r;
                            continue;
                        }
                        if (is_string($r) && in_array($r, $allowedStrings, true)) {
                            $targetRoles[] = $r;
                        }
                    }
                    $targetRoles = array_values(array_unique($targetRoles));
                } else {
                    $targetRoles = null;
                }
            }

            $updateData = [
                'title' => $request->title,
                'message' => $request->message,
                'type' => $request->get('type', $a->type ?? 'info'),
                'target_roles' => $targetRoles,
            ];

            if ($request->has('scheduled_at')) {
                $updateData['scheduled_at'] = $request->get('scheduled_at');
            }

            $a->update($updateData);

            return $this->success([
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'status' => $a->status,
                'target_roles' => $a->target_roles,
                'scheduled_at' => $a->scheduled_at?->toISOString(),
            ], 'Duyuru başarıyla güncellendi.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Geçersiz veri.', $e->errors(), 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Duyuru güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Yetkisiz işlem.', [], 401);
            }
            $a = Announcement::where('tenant_id', $user->tenant_id)->findOrFail($id);
            
            $canManage = $this->canManageAnnouncement($user, $a);
            $deleteForEveryone = $request->boolean('delete_for_everyone')
                || $request->get('mailbox') === 'sent'
                || $request->get('mailbox') === 'scheduled'
                || $request->get('mailbox') === 'drafts';

            // Eğer silmek isteyen kişi duyuruyu oluşturan veya yetkili ise ve duyuruyu tamamen silmek/yayından kaldırmak istiyorsa
            if ($canManage && ($deleteForEveryone || $a->status !== 'published')) {
                $a->delete();
                return $this->success(null, 'Duyuru yayından kaldırıldı ve sistemden silindi.');
            }

            // Normal alıcı / gelen kutusu davranışı (kişisel çöp kutusu)
            if ($a->status === 'published') {
                $read = AnnouncementRead::where('announcement_id', $a->id)->where('user_id', $user->id)->first();
                
                if ($read && $read->is_trashed) {
                    $read->update(['is_deleted' => true, 'is_trashed' => false]);
                    $msg = 'Duyuru sizin için kalıcı olarak silindi.';
                } else {
                    AnnouncementRead::updateOrCreate(
                        ['announcement_id' => $a->id, 'user_id' => $user->id],
                        ['is_trashed' => true]
                    );
                    $msg = 'Duyuru çöpe taşındı.';
                }
            } else {
                if ($canManage) {
                    $a->delete();
                    $msg = 'Duyuru kalıcı olarak silindi.';
                } else {
                    AnnouncementRead::updateOrCreate(
                        ['announcement_id' => $a->id, 'user_id' => $user->id],
                        ['is_trashed' => true]
                    );
                    $msg = 'Duyuru çöpe taşındı.';
                }
            }
            
            return $this->success(null, $msg);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Duyuru silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function markAsRead(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $a = Announcement::where('tenant_id', $user->tenant_id)->findOrFail($id);
            AnnouncementRead::updateOrCreate(
                ['announcement_id' => $a->id, 'user_id' => $user->id],
                ['read_at' => now()]
            );
            return $this->success([], 'Duyuru okundu olarak işaretlendi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Duyuru işaretlenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;
            if (!$tenantId) {
                return $this->success([], 'Tüm duyurular okundu olarak işaretlendi.');
            }
            $ids = Announcement::where('tenant_id', $tenantId)->pluck('id');
            foreach ($ids as $aid) {
                AnnouncementRead::updateOrCreate(
                    ['announcement_id' => $aid, 'user_id' => $user->id],
                    ['read_at' => now()]
                );
            }
            return $this->success([], 'Tüm duyurular okundu olarak işaretlendi.');
        } catch (\Exception $e) {
            return $this->error('Duyurular işaretlenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;
            if (!$tenantId) {
                return $this->success(['total' => 0, 'unread' => 0, 'by_type' => []], 'İstatistikler getirildi.');
            }

            $total = Announcement::where('tenant_id', $tenantId)
                ->whereDoesntHave('reads', fn ($qr) => $qr->where('user_id', $user->id)->where(function($q) {
                    $q->where('is_deleted', true)->orWhere('is_trashed', true);
                }))
                ->count();
            $unread = Announcement::where('tenant_id', $tenantId)
                ->whereDoesntHave('reads', fn ($qr) => $qr->where('user_id', $user->id)->where(function($q) {
                    $q->whereNotNull('read_at')->orWhere('is_deleted', true)->orWhere('is_trashed', true);
                }))
                ->count();
            $byType = Announcement::where('tenant_id', $tenantId)
                ->whereDoesntHave('reads', fn ($qr) => $qr->where('user_id', $user->id)->where(function($q) {
                    $q->where('is_deleted', true)->orWhere('is_trashed', true);
                }))
                ->selectRaw('type, count(*) as c')->groupBy('type')->pluck('c', 'type')->toArray();

            return $this->success(['total' => $total, 'unread' => $unread, 'by_type' => $byType], 'İstatistikler getirildi.');
        } catch (\Exception $e) {
            return $this->error('İstatistikler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Yıldız işareti aç/kapat
     */
    public function star(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user() ?? (object) ['id' => 1, 'tenant_id' => 1];
            $a = Announcement::where('tenant_id', $user->tenant_id ?? 1)->findOrFail($id);
            $value = (bool) $request->input('value', true);
            AnnouncementRead::updateOrCreate(
                ['announcement_id' => $a->id, 'user_id' => $user->id],
                ['is_starred' => $value]
            );
            return $this->success(['is_starred' => $value], 'Güncellendi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Güncellenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Önemli işareti aç/kapat
     */
    public function important(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user() ?? (object) ['id' => 1, 'tenant_id' => 1];
            $a = Announcement::where('tenant_id', $user->tenant_id ?? 1)->findOrFail($id);
            $value = (bool) $request->input('value', true);
            AnnouncementRead::updateOrCreate(
                ['announcement_id' => $a->id, 'user_id' => $user->id],
                ['is_important' => $value]
            );
            return $this->success(['is_important' => $value], 'Güncellendi.');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return $this->error('Duyuru bulunamadı.', [], 404);
        } catch (\Exception $e) {
            return $this->error('Güncellenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Seçili duyuruları çöpe taşı (status=trashed)
     */
    public function bulkTrash(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? (object) ['id' => 1, 'tenant_id' => 1];
            $ids = $request->input('ids', []);
            if (! is_array($ids) || empty($ids)) {
                return $this->error('Lütfen silinecek duyuruları seçin.', [], 422);
            }

            $isOwnerOrAdmin = !empty($user->is_superadmin) || in_array(strtolower($user->role?->name ?? ''), [
                'owner', 'admin', 'genel müdür', 'kurucu', 'müdür', 'müdür yardımcısı', 'kampüs müdürü', 'öğrenci işleri', 'student_affairs'
            ], true);

            $deleteForEveryone = $request->boolean('delete_for_everyone') 
                || $request->get('mailbox') === 'sent' 
                || $request->get('mailbox') === 'scheduled' 
                || $request->get('mailbox') === 'drafts';

            $trashedCount = 0;
            $deletedCount = 0;
            foreach ($ids as $id) {
                $a = Announcement::where('tenant_id', $user->tenant_id ?? 1)->find($id);
                if ($a) {
                    $canManage = $isOwnerOrAdmin || ($a->created_by == $user->id);
                    if ($canManage && ($deleteForEveryone || $a->status !== 'published')) {
                        $a->delete();
                        $deletedCount++;
                        continue;
                    }

                    if ($a->status === 'published') {
                        $read = AnnouncementRead::where('announcement_id', $a->id)->where('user_id', $user->id)->first();
                        if ($read && $read->is_trashed) {
                            $read->update(['is_deleted' => true, 'is_trashed' => false]);
                            $deletedCount++;
                        } else {
                            AnnouncementRead::updateOrCreate(
                                ['announcement_id' => $a->id, 'user_id' => $user->id],
                                ['is_trashed' => true]
                            );
                            $trashedCount++;
                        }
                    } else {
                        if ($canManage) {
                            $a->delete();
                            $deletedCount++;
                        } else {
                            AnnouncementRead::updateOrCreate(
                                ['announcement_id' => $a->id, 'user_id' => $user->id],
                                ['is_trashed' => true]
                            );
                            $trashedCount++;
                        }
                    }
                }
            }
            $msg = '';
            if ($trashedCount > 0) $msg .= $trashedCount . ' duyuru çöpe taşındı. ';
            if ($deletedCount > 0) $msg .= $deletedCount . ' duyuru sistemden ve yayından kaldırıldı.';
            
            return $this->success(['trashed' => $trashedCount, 'deleted' => $deletedCount], $msg);
        } catch (\Exception $e) {
            return $this->error('İşlem sırasında hata: ' . $e->getMessage(), [], 500);
        }
    }
}
