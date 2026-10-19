<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class UserController extends ApiController
{
    /**
     * Display a listing of users.
     */
    public function index(): JsonResponse
    {
        try {
            $user = auth()->user();
            $query = User::query()
                ->select([
                    'id',
                    'tenant_id',
                    'first_name',
                    'last_name',
                    'name',
                    'email',
                    'phone',
                    'role_id',
                    'campus_ids',
                    'education_level_ids',
                    'subjects',
                    'is_active',
                    'department',
                    'teacher_type',
                    'created_at',
                ])
                ->with(['role:id,name,display_name,level'])
                ->where('is_superadmin', false);

            // Duty schedule assignment: include both teacher roles and management roles
            // so that a duty manager/admin can be assigned as well.
            if (request()->boolean('duty_assignable')) {
                // Keep this list aligned with DutySchedulePolicy role IDs.
                // Exclude founder/owner from assignment by default.
                $dutyAssignableRoleIds = [2, 3, 4, 7, 10, 5, 6];
                $query->whereIn('role_id', $dutyAssignableRoleIds);
            }

            $roleName = $user && $user->role ? $user->role->name : null;
            $isFounder = in_array($roleName, ['owner'], true);
            $isForMessaging = request()->boolean('for_messaging') || request()->header('X-Purpose') === 'messaging';

            $teacherRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
            $isTeacherOrCounselor = $roleName && in_array($roleName, $teacherRoles, true);

            // Mesajlaşma için kullanıcılar çekildiğinde aktif veya is_active belirtilmemiş personeller listelensin
            if ($isForMessaging) {
                $query->where(function ($aq) {
                    $aq->where('is_active', true)->orWhereNull('is_active');
                });
            }

            // Kademe bazlı izolasyon: Sadece admin kullanıcı yönetim ekranında (UserList) ve kademe yöneticisi kısıtlaması gerektiğinde.
            // Mesajlaşmada, nöbet planlamasında ve öğretmen/rehberlik personellerinde tüm kurum personeli iletişim için görünür olmalıdır.
            if (! $isForMessaging && ! $isTeacherOrCounselor && $user && ! $user->is_superadmin && ! $isFounder && request()->boolean('admin_management')) {
                $levelIds  = array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? []))));

                if (! empty($levelIds)) {
                    $query->where(function ($lq) use ($levelIds) {
                        foreach ($levelIds as $lid) {
                            $lq->orWhereJsonContains('education_level_ids', $lid);
                        }
                        // Genel kurum personelleri / yöneticileri (kademe alanı boş olanlar) de dahil olsun
                        $lq->orWhereNull('education_level_ids')
                           ->orWhereJsonLength('education_level_ids', 0);
                    });
                }
            }

            if (request()->has('is_active')) {
                $query->where('is_active', request()->boolean('is_active'));
            }

            if (request()->filled('role')) {
                $roles = array_map('trim', explode(',', request('role')));
                $query->whereHas('role', function ($q) use ($roles) {
                    $q->withoutGlobalScope(TenantScope::class)->whereIn('name', $roles);
                });
            }

            // Support role_id filter for teacher role (role_id = 5)
            if (request()->filled('role_id')) {
                $query->where('role_id', request('role_id'));
            }

            if (request()->filled('campus_id')) {
                $query->whereJsonContains('campus_ids', (int) request('campus_id'));
            }

            if (request()->filled('education_level_id')) {
                $query->whereJsonContains('education_level_ids', (int) request('education_level_id'));
            }

            if (request()->filled('search')) {
                $search = request('search');
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            }

            $perPage = (int) request()->get('per_page', 15);
            if ($perPage <= 0) {
                $perPage = 15;
            }
            $perPage = min($perPage, 500);

            $users = $query->orderBy('first_name')->orderBy('last_name')->paginate($perPage);

            $items = array_map(function ($u) use ($user) {
                $uArr = is_array($u) ? $u : $u->toArray();
                $target = $u instanceof User ? $u : null;
                $canEdit = true;
                if ($user && $target) {
                    $user->loadMissing('role');
                    $target->loadMissing('role');
                    $canEdit = $user->canEditUser($target);
                }
                $uArr['can_edit'] = $canEdit;
                return $uArr;
            }, $users->items());

            return $this->success([
                'users' => $items,
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
            ], 'Kullanıcılar başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Kullanıcılar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $currentUser = auth()->user();
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'tc_no' => 'required|string|size:11|unique:users,tc_no',
                'email' => 'nullable|email|unique:users,email',
                'phone' => 'nullable|string|max:20',
                'birth_date' => 'nullable|date',
                'password' => 'nullable|string|min:6',
                'role_id' => 'required|integer|exists:roles,id',
                'campus_ids' => 'nullable|array',
                'campus_ids.*' => 'integer|exists:campuses,id',
                'education_level_ids' => 'nullable|array',
                'education_level_ids.*' => 'integer|exists:education_levels,id',
                'subjects' => 'nullable|array',
                'subjects.*' => 'string|max:255',
                'teacher_type' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'is_active' => 'boolean',
            ]);

            $roleName = $currentUser && $currentUser->role ? $currentUser->role->name : null;

            // Kurucu (owner) rolü okul panelinden atanamaz; yalnızca SaaS Süper Admin yönetimden tanımlayabilir
            $ownerRole = \App\Models\Role::withoutGlobalScope(TenantScope::class)->where('name', 'owner')->where('tenant_id', $currentUser->tenant_id)->first();
            if ($ownerRole && (int) $validated['role_id'] === (int) $ownerRole->id) {
                return $this->error('Kurum Sahibi rolü okul panelinden atanamaz. Bu işlem sadece EduLem Yönetim Paneli üzerinden yapılabilir.', [], 403);
            }

            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true)) {
                $allowed = $this->mudurAllowedCampusAndLevelIds($currentUser);
                $validated['campus_ids'] = array_values(array_intersect(
                    array_map('intval', (array) ($validated['campus_ids'] ?? [])),
                    $allowed['campus_ids']
                ));
                $validated['education_level_ids'] = array_values(array_intersect(
                    array_map('intval', (array) ($validated['education_level_ids'] ?? [])),
                    $allowed['education_level_ids']
                ));
            }

            $tenantId = $currentUser?->tenant_id ?? 1;
            $name = trim($validated['first_name'] . ' ' . ($validated['last_name'] ?? ''));
            $email = !empty($validated['email']) ? trim($validated['email']) : null;

            $userData = [
                'tenant_id' => $tenantId,
                'tc_no' => $validated['tc_no'],
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? null,
                'name' => $name ?: ($email ?: $validated['tc_no']),
                'email' => $email,
                'phone' => $validated['phone'] ?? null,
                'birth_date' => $validated['birth_date'] ?? null,
                'password' => bcrypt($validated['password'] ?? '123456'),
                'role_id' => $validated['role_id'],
                'campus_ids' => $validated['campus_ids'] ?? [],
                'education_level_ids' => $validated['education_level_ids'] ?? [],
                'subjects' => $validated['subjects'] ?? [],
                'teacher_type' => $validated['teacher_type'] ?? null,
                'department' => $validated['department'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ];

            try {
                $user = User::create($userData);
            } catch (\Illuminate\Database\QueryException $qe) {
                if (str_contains($qe->getMessage(), "Unknown column 'birth_date'") || str_contains($qe->getMessage(), "birth_date")) {
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER avatar');
                        $user = User::create($userData);
                    } catch (\Throwable $ex) {
                        unset($userData['birth_date']);
                        $user = User::create($userData);
                    }
                } elseif ($email === null && (str_contains($qe->getMessage(), "Column 'email' cannot be null") || (int)$qe->getCode() === 23000)) {
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NULL');
                        $user = User::create($userData);
                    } catch (\Throwable $ex) {
                        $userData['email'] = 'u' . $validated['tc_no'] . '@edulem.local';
                        $user = User::create($userData);
                    }
                } else {
                    throw $qe;
                }
            }

            return $this->success([
                'user' => $user->load('role')
            ], 'Kullanıcı başarıyla oluşturuldu.', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation errors:', $e->errors());
            return $this->error('Validasyon hatası.', $e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('User creation error:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->error('Kullanıcı oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified user.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $targetUser = User::with('role')->findOrFail($id);
            $currentUser = auth()->user();
            $roleName = $currentUser && $currentUser->role ? $currentUser->role->name : null;

            $teacherRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
            $isTeacher = $roleName && in_array($roleName, $teacherRoles, true);

            // Öğretmen kontrolü: Öğretmen kendisi dışındaki bir kullanıcının detayına kesinlikle erişemez
            if ($isTeacher && (int) $currentUser->id !== (int) $targetUser->id) {
                return $this->error('Bu kullanıcıya erişim yetkiniz yok.', [], 403);
            }

            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true)) {
                if ($targetUser->role && $targetUser->role->name === 'owner') {
                    return $this->error('Bu kullanıcıya erişim yetkiniz yok.', [], 403);
                }
                if (!$this->mudurCanAccessUser($currentUser, $targetUser)) {
                    return $this->error('Bu kullanıcıya erişim yetkiniz yok.', [], 403);
                }
            }

            // Yetkisiz kullanıcılar için (yönetici olmayanlar ve kendisi olmayanlar) TC kimlik numarasını gizle
            if ((int) $currentUser->id !== (int) $targetUser->id && !in_array($roleName, ['owner', 'Admin', 'Genel Müdür', 'Müdür', 'Müdür Yardımcısı'], true)) {
                $targetUser->tc_no = null;
            }

            $campusIds = array_filter(array_map('intval', (array) ($targetUser->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($targetUser->education_level_ids ?? [])));
            $campuses = $campusIds ? \App\Models\Campus::whereIn('id', $campusIds)->get(['id', 'name']) : collect();
            $educationLevels = $educationLevelIds ? \App\Models\EducationLevel::whereIn('id', $educationLevelIds)->get(['id', 'name']) : collect();
            $targetUser->setAttribute('campuses', $campuses);
            $targetUser->setAttribute('education_levels', $educationLevels);
            $targetUser->setAttribute('campus_name', $campuses->pluck('name')->implode(', ') ?: null);
            $targetUser->setAttribute('education_level_name', $educationLevels->pluck('name')->implode(', ') ?: null);

            // Yetkileri yükle
            $targetUser->loadMissing('role.permissions');
            $permissions = [];
            if ($targetUser->role && $targetUser->role->permissions) {
                foreach ($targetUser->role->permissions as $p) {
                    $permissions[] = [
                        'id' => $p->id,
                        'name' => $p->name,
                        'display_name' => $p->display_name ?? $p->name,
                        'module_name' => $p->module ?? $p->category ?? 'Genel',
                        'action' => $p->action ?? '',
                        'description' => $p->description,
                    ];
                }
            }
            $targetUser->setAttribute('permissions', $permissions);

            // Sınıf Rehber Öğretmenliği (Sorumlu Olduğu Sınıflar)
            $managedClassrooms = \App\Models\Classroom::where('teacher_id', $targetUser->id)
                ->where('is_active', true)
                ->get(['id', 'name', 'code', 'grade_level', 'capacity']);
            $targetUser->setAttribute('managed_classrooms', $managedClassrooms);

            // Ders Programı ve Ders Verdiği Sınıflar
            $schedules = \App\Models\Schedule::where(function ($q) use ($targetUser) {
                    $q->where('teacher_id', $targetUser->id)
                      ->orWhereJsonContains('assistant_teacher_ids', (int) $targetUser->id)
                      ->orWhereJsonContains('assistant_teacher_ids', (string) $targetUser->id);
                })
                ->with(['classroom:id,name,grade_level', 'lesson:id,name,code'])
                ->get(['id', 'classroom_id', 'lesson_id', 'day_of_week', 'start_time', 'end_time']);

            $teachingAssignments = $schedules->filter(fn($s) => $s->classroom !== null)->map(function ($s) {
                return [
                    'classroom_id' => $s->classroom_id,
                    'classroom_name' => $s->classroom?->name ?? 'Sınıf',
                    'grade_level' => $s->classroom?->grade_level,
                    'lesson_name' => $s->lesson?->name ?? 'Ders',
                ];
            })->unique(fn($item) => $item['classroom_id'] . '-' . $item['lesson_name'])->values();
            $targetUser->setAttribute('teaching_assignments', $teachingAssignments);
            $targetUser->setAttribute('schedule_count', $schedules->count());

            // Rehberlik / Danışmanlık Bilgileri
            $counselingSessionsCount = 0;
            $counselingStudentsCount = 0;
            try {
                if (class_exists(\App\Models\CounselingSession::class)) {
                    $counselingSessionsCount = \App\Models\CounselingSession::where('counselor_id', $targetUser->id)->count();
                }
                if (class_exists(\App\Models\CounselingStudent::class)) {
                    $counselingStudentsCount = \App\Models\CounselingStudent::where('counselor_id', $targetUser->id)->count();
                }
            } catch (\Throwable $e) {}

            // Aktivite İstatistikleri (Kurucu / Yönetici görünümü için)
            $homeworkCount = 0;
            $attendanceCount = 0;
            $meetingCount = 0;
            $announcementCount = 0;
            $tutoringCount = 0;
            $recentHomeworks = collect();
            $recentMeetings = collect();
            $recentAnnouncements = collect();

            try {
                if (class_exists(\App\Models\Homework::class)) {
                    $homeworkCount = \App\Models\Homework::where('teacher_id', $targetUser->id)->count();
                    $recentHomeworks = \App\Models\Homework::where('teacher_id', $targetUser->id)
                        ->with('classroom:id,name')
                        ->latest()
                        ->take(5)
                        ->get(['id', 'title', 'classroom_id', 'due_date', 'created_at']);
                }
            } catch (\Throwable $e) {}

            try {
                if (class_exists(\App\Models\Attendance::class)) {
                    $attendanceCount = \App\Models\Attendance::where('teacher_id', $targetUser->id)->count();
                }
            } catch (\Throwable $e) {}

            try {
                if (class_exists(\App\Models\TeacherMeeting::class)) {
                    $meetingCount = \App\Models\TeacherMeeting::where('teacher_id', $targetUser->id)->count();
                    $recentMeetings = \App\Models\TeacherMeeting::where('teacher_id', $targetUser->id)
                        ->with('student:id,first_name,last_name')
                        ->latest()
                        ->take(5)
                        ->get(['id', 'student_id', 'meeting_date', 'status', 'notes', 'created_at']);
                }
            } catch (\Throwable $e) {}

            try {
                if (class_exists(\App\Models\Announcement::class)) {
                    $announcementCount = \App\Models\Announcement::where('created_by', $targetUser->id)->count();
                    $recentAnnouncements = \App\Models\Announcement::where('created_by', $targetUser->id)
                        ->latest()
                        ->take(5)
                        ->get(['id', 'title', 'type', 'scheduled_at', 'created_at']);
                }
            } catch (\Throwable $e) {}

            try {
                if (class_exists(\App\Models\TutoringSession::class)) {
                    $tutoringCount = \App\Models\TutoringSession::where('teacher_id', $targetUser->id)->count();
                }
            } catch (\Throwable $e) {}

            $targetUser->setAttribute('statistics', [
                'homework_count' => $homeworkCount,
                'attendance_count' => $attendanceCount,
                'meeting_count' => $meetingCount,
                'announcement_count' => $announcementCount,
                'tutoring_count' => $tutoringCount,
                'counseling_sessions_count' => $counselingSessionsCount,
                'counseling_students_count' => $counselingStudentsCount,
            ]);

            $targetUser->setAttribute('recent_activities', [
                'homeworks' => $recentHomeworks,
                'meetings' => $recentMeetings,
                'announcements' => $recentAnnouncements,
            ]);

            // Oturum ve giriş bilgisi
            $lastToken = null;
            $tokenCount = 0;
            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('personal_access_tokens')) {
                    $tokenQuery = \Illuminate\Support\Facades\DB::table('personal_access_tokens')
                        ->where('tokenable_type', 'App\Models\User')
                        ->where('tokenable_id', $targetUser->id);
                    $tokenCount = $tokenQuery->count();
                    $lastToken = $tokenQuery->orderByDesc('last_used_at')->first(['last_used_at', 'created_at', 'name']);
                }
            } catch (\Throwable $e) {}

            $targetUser->setAttribute('session_info', [
                'last_active_at' => $lastToken?->last_used_at ?? $targetUser->last_login_at ?? $targetUser->updated_at,
                'token_device' => $lastToken?->name ?? 'Web / Mobil Oturum',
                'total_active_tokens' => $tokenCount,
            ]);

            return $this->success(['user' => $targetUser], 'Kullanıcı başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Kullanıcı bulunamadı.', [], 404);
        }
    }

    /**
     * Müdürün hedef kullanıcıya (kendi kademe/kampüsüne atanmış personel) erişip erişemeyeceği.
     */
    private function mudurCanAccessUser(User $mudur, User $target): bool
    {
        $campusIds = array_filter(array_map('intval', (array) ($mudur->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($mudur->education_level_ids ?? [])));
        if (empty($campusIds) && empty($educationLevelIds)) {
            return (int) $target->tenant_id === (int) $mudur->tenant_id;
        }
        $targetCampusIds = array_filter(array_map('intval', (array) ($target->campus_ids ?? [])));
        $targetLevelIds = array_filter(array_map('intval', (array) ($target->education_level_ids ?? [])));
        $campusOverlap = empty($campusIds) || !empty(array_intersect($campusIds, $targetCampusIds));
        $levelOverlap = empty($educationLevelIds) || !empty(array_intersect($educationLevelIds, $targetLevelIds));
        return $campusOverlap && $levelOverlap;
    }

    /**
     * Müdürün atayabileceği kampüs/kademe ID'lerinin kendi atandığı listeyi aşmaması.
     */
    private function mudurAllowedCampusAndLevelIds(User $mudur): array
    {
        return [
            'campus_ids' => array_filter(array_map('intval', (array) ($mudur->campus_ids ?? []))),
            'education_level_ids' => array_filter(array_map('intval', (array) ($mudur->education_level_ids ?? []))),
        ];
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $user = User::with('role')->findOrFail($id);
            $currentUser = auth()->user();
            $roleName = $currentUser && $currentUser->role ? $currentUser->role->name : null;

            $teacherRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
            $isTeacher = $roleName && in_array($roleName, $teacherRoles, true);
            if ($isTeacher && (int) $currentUser->id !== (int) $user->id) {
                return $this->error('Bu kullanıcıyı düzenleme yetkiniz yok.', [], 403);
            }

            if ($currentUser && ! $currentUser->is_superadmin) {
                $currentUser->loadMissing('role');
                $user->loadMissing('role');
                if (! $currentUser->canEditUser($user)) {
                    return $this->error('Bu kullanıcıyı düzenleme yetkiniz yok.', [], 403);
                }
            }

            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true)) {
                if ($user->role && $user->role->name === 'owner') {
                    return $this->error('Kurucu kullanıcı düzenlenemez.', [], 403);
                }
                if (!$this->mudurCanAccessUser($currentUser, $user)) {
                    return $this->error('Bu kullanıcıyı düzenleme yetkiniz yok.', [], 403);
                }
            }

            $validated = $request->validate([
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'tc_no' => 'sometimes|string|size:11|unique:users,tc_no,' . $id,
                'email' => 'nullable|email|unique:users,email,' . $id,
                'phone' => 'nullable|string|max:20',
                'birth_date' => 'nullable|date',
                'password' => 'nullable|string|min:6',
                'role_id' => 'sometimes|integer|exists:roles,id',
                'campus_ids' => 'nullable|array',
                'campus_ids.*' => 'integer|exists:campuses,id',
                'education_level_ids' => 'nullable|array',
                'education_level_ids.*' => 'integer|exists:education_levels,id',
                'subjects' => 'nullable|array',
                'teacher_type' => 'nullable|string|max:255',
                'department' => 'nullable|string|max:255',
                'is_active' => 'nullable|boolean',
            ]);

            if (array_key_exists('email', $validated)) {
                $validated['email'] = !empty($validated['email']) ? trim($validated['email']) : null;
            }

            if (!empty($validated['password'])) {
                $validated['password'] = bcrypt($validated['password']);
            } else {
                unset($validated['password']);
            }

            if (isset($validated['first_name']) || isset($validated['last_name'])) {
                $validated['name'] = trim(($validated['first_name'] ?? $user->first_name) . ' ' . ($validated['last_name'] ?? $user->last_name ?: ''));
            }

            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true) && (isset($validated['campus_ids']) || isset($validated['education_level_ids']))) {
                $allowed = $this->mudurAllowedCampusAndLevelIds($currentUser);
                if (isset($validated['campus_ids'])) {
                    $validated['campus_ids'] = array_values(array_intersect(
                        array_map('intval', (array) $validated['campus_ids']),
                        $allowed['campus_ids']
                    ));
                }
                if (isset($validated['education_level_ids'])) {
                    $validated['education_level_ids'] = array_values(array_intersect(
                        array_map('intval', (array) $validated['education_level_ids']),
                        $allowed['education_level_ids']
                    ));
                }
            }

            try {
                $user->update($validated);
            } catch (\Illuminate\Database\QueryException $qe) {
                if (str_contains($qe->getMessage(), "Unknown column 'birth_date'") || str_contains($qe->getMessage(), "birth_date")) {
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER avatar');
                        $user->update($validated);
                    } catch (\Throwable $ex) {
                        unset($validated['birth_date']);
                        $user->update($validated);
                    }
                } elseif (array_key_exists('email', $validated) && $validated['email'] === null && (str_contains($qe->getMessage(), "Column 'email' cannot be null") || (int)$qe->getCode() === 23000)) {
                    try {
                        \Illuminate\Support\Facades\DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NULL');
                        $user->update($validated);
                    } catch (\Throwable $ex) {
                        unset($validated['email']);
                        $user->update($validated);
                    }
                } else {
                    throw $qe;
                }
            }

            return $this->success([
                'user' => $user->load('role')
            ], 'Kullanıcı güncellendi.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Update validation errors for user ' . $id . ':', $e->errors());
            return $this->error('Validasyon hatası.', $e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('User update error:', ['message' => $e->getMessage()]);
            return $this->error('Kullanıcı güncellenemedi: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Export users as Excel or PDF.
     */
    public function export(Request $request)
    {
        try {
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            $isFounder = in_array($roleName, ['owner'], true);

            $validated = $request->validate([
                'format' => 'required|in:excel,pdf',
                'scope' => 'required|in:all,users',
                'columns' => 'required|array|min:1',
                'columns.*' => 'string',
                'user_ids' => 'nullable|array',
                'user_ids.*' => 'integer',
            ]);

            $format = $validated['format'];
            $scope = $validated['scope'];
            $requestedColumns = $validated['columns'];

            $allowedColumns = [
                'name' => ['label' => 'Ad Soyad'],
                'email' => ['label' => 'E-posta'],
                'phone' => ['label' => 'Telefon'],
                'role_name' => ['label' => 'Rol'],
                'campus_name' => ['label' => 'Kampüs'],
                'education_level_name' => ['label' => 'Kademe'],
                'department' => ['label' => 'Departman'],
                'teacher_type' => ['label' => 'Personel Türü'],
                'is_active' => ['label' => 'Durum'],
                'created_at' => ['label' => 'Kayıt Tarihi'],
            ];

            $columns = array_values(array_filter(array_map(static fn ($c) => is_string($c) ? trim($c) : '', $requestedColumns)));
            $columns = array_values(array_unique($columns));
            $columns = array_values(array_filter($columns, static fn ($c) => $c !== '' && array_key_exists($c, $allowedColumns)));

            if (empty($columns)) {
                return $this->error('Geçerli sütun bulunamadı.', [], 422);
            }

            $query = User::query()
                ->with(['role:id,name,display_name,level'])
                ->where('is_superadmin', false);

            $userTenantId = $user ? ($user->tenant_id ?? null) : null;
            $isSuperAdmin = $user && $user->is_superadmin;
            if ($user && ! $isSuperAdmin && $userTenantId) {
                $query->where('tenant_id', $userTenantId);
            }

            // Kampüs bazlı izolasyon: Kurucu (owner) hariç herkes sadece kendi kampüslerindeki kullanıcıları export edebilsin.
            if ($user && ! $isSuperAdmin && ! $isFounder) {
                $levelIds = array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? []))));
                if (! empty($levelIds)) {
                    $query->where(function ($q) use ($levelIds) {
                        foreach ($levelIds as $lid) {
                            $q->orWhereJsonContains('education_level_ids', $lid);
                        }
                        $q->orWhereNull('education_level_ids')
                          ->orWhereJsonLength('education_level_ids', 0);
                    });
                }
            }

            if ($scope === 'users') {
                $userIds = $request->input('user_ids', []);
                if (! is_array($userIds) || empty($userIds)) {
                    return $this->error('Seçili kullanıcılar için user_ids zorunludur.', [], 422);
                }
                $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds), static fn ($id) => $id > 0)));
                if (empty($userIds)) {
                    return $this->error('Geçerli user_ids bulunamadı.', [], 422);
                }
                $query->whereIn('id', $userIds);
            }

            $query->select([
                'id', 'tenant_id', 'first_name', 'last_name', 'name', 'email', 'phone', 'role_id',
                'campus_ids', 'education_level_ids', 'department', 'teacher_type', 'is_active', 'created_at',
            ]);

            $users = $query->orderBy('first_name')->orderBy('last_name')->get();

            $campusIdSet = [];
            $levelIdSet = [];
            foreach ($users as $u) {
                foreach ((array) ($u->campus_ids ?? []) as $cid) {
                    $cid = (int) $cid;
                    if ($cid > 0) $campusIdSet[$cid] = true;
                }
                foreach ((array) ($u->education_level_ids ?? []) as $lid) {
                    $lid = (int) $lid;
                    if ($lid > 0) $levelIdSet[$lid] = true;
                }
            }
            $campusIds = array_keys($campusIdSet);
            $levelIds = array_keys($levelIdSet);

            $campusMap = [];
            if (!empty($campusIds)) {
                $campusMap = \App\Models\Campus::whereIn('id', $campusIds)->get(['id', 'name'])->pluck('name', 'id')->toArray();
            }
            $levelMap = [];
            if (!empty($levelIds)) {
                $levelMap = \App\Models\EducationLevel::whereIn('id', $levelIds)->get(['id', 'name'])->pluck('name', 'id')->toArray();
            }

            $headers = array_map(static fn ($c) => $allowedColumns[$c]['label'], $columns);
            $rows = [];
            foreach ($users as $u) {
                $fullName = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));
                $campusNames = collect((array) ($u->campus_ids ?? []))
                    ->map(static fn ($id) => $campusMap[(int) $id] ?? null)
                    ->filter()
                    ->values()
                    ->implode(', ');
                $levelNames = collect((array) ($u->education_level_ids ?? []))
                    ->map(static fn ($id) => $levelMap[(int) $id] ?? null)
                    ->filter()
                    ->values()
                    ->implode(', ');

                $row = [];
                foreach ($columns as $c) {
                    $row[] = match ($c) {
                        'name' => (string) ($fullName ?: ($u->name ?? '')),
                        'email' => (string) ($u->email ?? ''),
                        'phone' => (string) ($u->phone ?? ''),
                        'role_name' => (string) ($u->role?->display_name ?? $u->role?->name ?? ''),
                        'campus_name' => (string) ($campusNames ?? ''),
                        'education_level_name' => (string) ($levelNames ?? ''),
                        'department' => (string) ($u->department ?? ''),
                        'teacher_type' => (string) ($u->teacher_type ?? ''),
                        'is_active' => $u->is_active ? 'Aktif' : 'Pasif',
                        'created_at' => $u->created_at ? $u->created_at->format('Y-m-d H:i') : '',
                        default => '',
                    };
                }
                $rows[] = $row;
            }

            $tenantId = $user ? ($user->tenant_id ?? 'default') : 'default';
            $tenant = $tenantId ? \App\Models\Tenant::find($tenantId) : null;

            if ($format === 'excel') {
                $spreadsheet = new Spreadsheet();
                $sheet = $spreadsheet->getActiveSheet();

                $headerStyle = [
                    'font' => [
                        'bold' => true,
                        'color' => ['rgb' => 'FFFFFF'],
                        'size' => 12,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '4472C4'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'D1D5DB'],
                        ],
                    ],
                ];

                $zebraFill = [
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => 'F3F4F6'],
                    ],
                ];

                $cellStyle = [
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                        'wrapText' => true,
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['rgb' => 'E5E7EB'],
                        ],
                    ],
                ];

                $rowNo = 1;
                $col = 'A';
                foreach ($headers as $header) {
                    $sheet->setCellValue($col . $rowNo, $header);
                    $sheet->getStyle($col . $rowNo)->applyFromArray($headerStyle);
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                    $col++;
                }

                $rowNo = 2;
                foreach ($rows as $rIdx => $r) {
                    $col = 'A';
                    foreach ($r as $cell) {
                        $sheet->setCellValue($col . $rowNo, $cell);
                        $sheet->getStyle($col . $rowNo)->applyFromArray($cellStyle);
                        $col++;
                    }
                    if (($rIdx % 2) === 1) {
                        $lastCol = chr(ord('A') + count($headers) - 1);
                        $sheet->getStyle('A' . $rowNo . ':' . $lastCol . $rowNo)->applyFromArray($zebraFill);
                    }
                    $rowNo++;
                }

                $fileName = 'users_export_' . now()->format('Y-m-d_His') . '.xlsx';
                $filePath = "exports/{$tenantId}/{$fileName}";

                $writer = new Xlsx($spreadsheet);
                $tempFile = tempnam(sys_get_temp_dir(), 'users_');
                $writer->save($tempFile);
                Storage::disk('local')->put($filePath, file_get_contents($tempFile));
                @unlink($tempFile);

                return response()->download(storage_path('app/' . $filePath), $fileName)->deleteFileAfterSend(false);
            }

            $pdf = Pdf::loadView('reports.users', [
                'data' => [
                    'headers' => $headers,
                    'rows' => $rows,
                ],
                'tenant' => $tenant,
                'generatedAt' => now()->format('d.m.Y H:i'),
            ])->setPaper('a4', 'landscape');

            $fileName = 'users_export_' . now()->format('Y-m-d_His') . '.pdf';
            $filePath = "exports/{$tenantId}/{$fileName}";
            Storage::disk('local')->put($filePath, $pdf->output());

            return response()->download(storage_path('app/' . $filePath), $fileName)->deleteFileAfterSend(false);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Validasyon hatası.', $e->errors(), 422);
        } catch (\Exception $e) {
            \Log::error('User export error:', ['message' => $e->getMessage()]);
            return $this->error('Dışa aktarma sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified user.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $user = User::with('role')->findOrFail($id);
            $currentUser = auth()->user();
            $roleName = $currentUser && $currentUser->role ? $currentUser->role->name : null;

            $teacherRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'];
            if ($roleName && in_array($roleName, $teacherRoles, true)) {
                return $this->error('Kullanıcı silme yetkiniz bulunmamaktadır.', [], 403);
            }

            if ($user->is_superadmin) {
                return $this->error('Süper admin kullanıcı silinemez.', [], 403);
            }
            if ($currentUser && ! $currentUser->is_superadmin) {
                $currentUser->loadMissing('role');
                $user->loadMissing('role');
                if (! $currentUser->canEditUser($user)) {
                    return $this->error('Bu kullanıcı üzerinde işlem yetkiniz yok.', [], 403);
                }
            }

            // İki aşamalı silme: önce pasife al, sadece pasifken kalıcı sil.
            if ($user->is_active) {
                $user->update(['is_active' => false]);
                return $this->success([], 'Kullanıcı pasife alındı.');
            }

            $user->delete();
            return $this->success([], 'Kullanıcı silindi.');
        } catch (\Exception $e) {
            \Log::error('User delete error:', ['message' => $e->getMessage()]);
            return $this->error('Kullanıcı silinemedi.', [], 500);
        }
    }
}
