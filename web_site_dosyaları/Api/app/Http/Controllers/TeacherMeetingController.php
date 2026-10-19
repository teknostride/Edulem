<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\TeacherMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TeacherMeetingController extends ApiController
{
    private const TEACHER_ROLES = [
        'Öğretmen',
        'Sınıf Öğretmeni',
        'teacher',
        'Rehberlik',
        'guidance',
        'Rehber Öğretmen',
        'rehber_teacher',
        'guidance_teacher',
        '6',
    ];

    private function resolveRoleName(?\App\Models\User $user): ?string
    {
        if (!$user) {
            return null;
        }

        $name = $user->role?->name
            ?? ($user->role_name ?? null)
            ?? ($user->role ?? null)
            ?? null;

        if ($name) {
            return $name;
        }

        $roleId = $user->role_id ?? null;
        if ($roleId) {
            $dbName = DB::table('roles')->where('id', (int) $roleId)->value('name');
            if (is_string($dbName) && $dbName !== '') {
                return $dbName;
            }
        }

        return null;
    }

    private function ensureTeacherUser(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Kullanıcı oturumu bulunamadı.',
                'debug' => ['reason' => 'user_null'],
            ], 401);
        }

        $roleName = $this->resolveRoleName($user);
        $roleId = (int) ($user->role_id ?? 0);

        // Öğrenci veya veli ise engelle
        if (in_array($roleId, [1, 2], true) || in_array(mb_strtolower((string) $roleName, 'UTF-8'), ['student', 'parent', 'öğrenci', 'veli'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu işlem için yetkiniz bulunmamaktadır.',
                'debug' => [
                    'reason' => 'student_or_parent_blocked',
                    'role_id' => $roleId,
                    'role_name' => $roleName,
                ],
            ], 403);
        }

        if (!$this->isTeacherRole($roleName, $roleId)) {
            return response()->json([
                'success' => false,
                'message' => 'Bu endpoint sadece öğretmen kullanıcılar içindir.',
                'debug' => [
                    'reason' => 'isTeacherRole_false',
                    'user_id' => $user->id,
                    'role_id' => $roleId,
                    'role_name' => $roleName,
                ],
            ], 403);
        }

        return null;
    }

    private function isGuidanceOrAdminRole(?string $roleName): bool
    {
        if (!$roleName) {
            return false;
        }
        $r = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($r, [
            'rehberlik', 'guidance', 'rehber öğretmen', 'rehber ogretmen',
            'rehber_teacher', 'guidance_teacher', 'admin', 'kurucu', 'müdür', 'mudur',
            'müdür yardımcısı', 'mudur yardimcisi', 'super admin', 'superadmin', 'yönetici', 'yonetici'
        ], true) || str_contains($r, 'rehber');
    }

    private function isTeacherRole(?string $roleName, int $roleId = 0): bool
    {
        if (in_array($roleId, [3, 4, 5, 6, 7, 8], true)) {
            return true;
        }

        if (!$roleName) {
            return true;
        }

        $normalized = mb_strtolower(trim($roleName), 'UTF-8');
        $allowed = [
            'öğretmen', 'ogretmen', 'sınıf öğretmeni', 'sinif ogretmeni', 'teacher',
            'rehberlik', 'guidance', 'rehber öğretmen', 'rehber ogretmen',
            'rehber_teacher', 'guidance_teacher', '5', '6',
            'admin', 'kurucu', 'müdür', 'mudur', 'müdür yardımcısı', 'mudur yardimcisi',
            'yönetici', 'yonetici', 'super admin', 'superadmin'
        ];

        if (in_array($normalized, $allowed, true) || in_array($roleName, self::TEACHER_ROLES, true)) {
            return true;
        }

        return str_contains($normalized, 'öğretmen')
            || str_contains($normalized, 'ogretmen')
            || str_contains($normalized, 'teacher')
            || str_contains($normalized, 'rehber');
    }

    private function teacherAllowedClassroomIds($user): array
    {
        $teacherId = (int) $user->id;
        $roleName = $this->resolveRoleName($user);
        $activeSeasonId = $this->getCurrentSeasonId()
            ?? \App\Models\Season::where('tenant_id', $user->tenant_id)->where('is_active', true)->value('id');

        // Rehberlik, yönetici veya danışman ise okulun aktif sezon sınıflarına yetkili
        if ($this->isGuidanceOrAdminRole($roleName)) {
            $q = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $user->tenant_id);
            if ($activeSeasonId) {
                $q->where('season_id', $activeSeasonId);
            }
            $ids = $q->pluck('id')->map(fn($id) => (int) $id)->all();
            if (empty($ids)) {
                $ids = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tenant_id', $user->tenant_id)
                    ->pluck('id')->map(fn($id) => (int) $id)->all();
            }
            return $ids;
        }

        // Schedule'dan gelen sınıf ID'leri (aktif sezon öncelikli)
        $fromSchedules = Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->forTeacher($teacherId)
            ->when($activeSeasonId, fn($q) => $q->where('season_id', $activeSeasonId))
            ->whereNotNull('classroom_id')
            ->pluck('classroom_id')
            ->map(fn($id) => (int) $id)
            ->filter(fn($id) => $id > 0)
            ->values()
            ->all();

        // Doğrudan sınıf öğretmenliği
        $fromClassroomDirect = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $teacherId)
            ->when($activeSeasonId, fn($q) => $q->where('season_id', $activeSeasonId))
            ->pluck('id')
            ->map(fn($id) => (int) $id)
            ->filter(fn($id) => $id > 0)
            ->values()
            ->all();

        $ids = array_values(array_unique(array_merge($fromSchedules, $fromClassroomDirect)));

        // Eğer öğretmenin programında henüz sınıf yoksa aktif sezon sınıflarına erişebilsin
        if (empty($ids)) {
            $fallbackQ = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $user->tenant_id);
            if ($activeSeasonId) {
                $fallbackQ->where('season_id', $activeSeasonId);
            }
            $ids = $fallbackQ->pluck('id')->map(fn($id) => (int) $id)->all();
            if (empty($ids)) {
                $ids = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tenant_id', $user->tenant_id)
                    ->pluck('id')->map(fn($id) => (int) $id)->all();
            }
        }

        return $ids;
    }

    /**
     * Görüşme kayıtları listesi (type=meeting, visibility != private)
     */
    public function meetings(Request $request): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $query = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->where('type', TeacherMeeting::TYPE_MEETING)
            ->where('visibility', '!=', TeacherMeeting::VISIBILITY_PRIVATE);

        if ($request->filled('season_id')) {
            $query->where('season_id', (int) $request->query('season_id'));
        }

        $records = $query
            ->with([
                'student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                    'classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                        'educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class),
                    ]),
                ]),
            ])
            ->orderByDesc('meeting_date')
            ->orderByDesc('created_at')
            ->get();

        return $this->success([
            'meetings' => $records->map(fn($m) => $this->formatMeeting($m)),
        ]);
    }

    /**
     * Özel notlar listesi (type=meeting, visibility=private)
     */
    public function privateNotes(Request $request): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $query = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->where('type', TeacherMeeting::TYPE_MEETING)
            ->where('visibility', TeacherMeeting::VISIBILITY_PRIVATE);

        if ($request->filled('season_id')) {
            $query->where('season_id', (int) $request->query('season_id'));
        }

        $records = $query
            ->with([
                'student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                    'classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                        'educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class),
                    ]),
                ]),
            ])
            ->orderByDesc('meeting_date')
            ->orderByDesc('created_at')
            ->get();

        return $this->success([
            'notes' => $records->map(fn($m) => $this->formatMeeting($m)),
        ]);
    }

    /**
     * Randevular listesi (type=appointment)
     */
    public function appointments(Request $request): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();
        $filter = $request->query('filter', 'today'); // today | upcoming | past

        $query = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->where('type', TeacherMeeting::TYPE_APPOINTMENT);

        if ($request->filled('season_id')) {
            $query->where('season_id', (int) $request->query('season_id'));
        }

        $query->with([
            'student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                'classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                    'educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class),
                ]),
            ]),
        ]);

        $today = Carbon::today()->toDateString();

        if ($filter === 'today') {
            $query->whereDate('meeting_date', $today);
        } elseif ($filter === 'upcoming') {
            $query->whereDate('meeting_date', '>', $today);
        } elseif ($filter === 'past') {
            $query->whereDate('meeting_date', '<', $today);
        }

        $records = $query
            ->orderBy('meeting_date')
            ->orderBy('meeting_time')
            ->get();

        return $this->success([
            'appointments' => $records->map(fn($m) => $this->formatMeeting($m)),
        ]);
    }

    /**
     * Tek kayıt detayı
     */
    public function show(Request $request, int $id): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $meeting = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->with([
                'student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                    'classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with([
                        'educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class),
                    ]),
                ]),
            ])
            ->find($id);

        if (!$meeting) {
            return $this->error('Kayıt bulunamadı.', [], 404);
        }

        return $this->success([
            'meeting' => $this->formatMeeting($meeting),
        ]);
    }

    /**
     * Yeni görüşme/not/randevu oluştur
     */
    public function store(Request $request): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $request->validate([
            'type' => 'required|in:meeting,appointment',
            'meeting_with' => 'required|in:student,parent',
            'classroom_id' => 'required|integer|exists:classrooms,id',
            'student_id' => 'required|integer|exists:students,id',
            'title' => 'required_if:type,meeting|string|max:255',
            'content' => 'nullable|string',
            'meeting_date' => 'required|date',
            'meeting_time' => 'nullable|date_format:H:i',
            'visibility' => 'required_if:type,meeting|in:admin_only,teachers_open,public,private',
        ]);

        $classroomId = (int) $request->classroom_id;
        $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);

        if (!in_array($classroomId, $allowedClassroomIds, true)) {
            return $this->error('Bu sınıfa erişim yetkiniz yok.', [], 403);
        }

        $classroom = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->find($classroomId);

        if (!$classroom) {
            return $this->error('Sınıf bulunamadı.', [], 404);
        }

        // Öğrencinin bu tenant'a ait olduğunu ve seçilen sınıfta olduğunu doğrula
        $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('classroom_id', $classroomId)
            ->find($request->student_id);

        if (!$student) {
            return $this->error('Öğrenci seçilen sınıfta bulunamadı.', [], 422);
        }

        $activeSeasonId = $request->input('season_id')
            ?? $request->header('X-Season-Id')
            ?? \App\Models\Season::where('tenant_id', $user->tenant_id)->where('is_active', true)->value('id');

        $data = [
            'tenant_id' => $user->tenant_id,
            'season_id' => $activeSeasonId,
            'teacher_id' => $user->id,
            'student_id' => $request->input('student_id'),
            'meeting_with' => $request->input('meeting_with'),
            'type' => $request->input('type'),
            'title' => $request->input('type') === 'appointment' ? ($request->input('title') ?? 'Randevu') : $request->input('title'),
            'content' => $request->input('content'),
            'meeting_date' => $request->input('meeting_date'),
            'meeting_time' => $request->input('meeting_time'),
            'visibility' => $request->input('type') === 'appointment' ? 'admin_only' : $request->input('visibility'),
            'status' => 'planned',
        ];

        $meeting = TeacherMeeting::create($data);
        $meeting->load(['student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with(['classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with(['educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class)])])]);

        return $this->success([
            'meeting' => $this->formatMeeting($meeting),
        ], 'Kayıt başarıyla oluşturuldu.', 201);
    }

    /**
     * Güncelle
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $meeting = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->find($id);

        if (!$meeting) {
            return $this->error('Kayıt bulunamadı.', [], 404);
        }

        $request->validate([
            'meeting_with' => 'sometimes|in:student,parent',
            'classroom_id' => 'sometimes|integer|exists:classrooms,id',
            'student_id' => 'sometimes|integer|exists:students,id',
            'title' => 'sometimes|string|max:255',
            'content' => 'nullable|string',
            'meeting_date' => 'sometimes|date',
            'meeting_time' => 'nullable|date_format:H:i',
            'visibility' => 'sometimes|in:admin_only,teachers_open,public,private',
            'status' => 'sometimes|in:planned,completed,cancelled',
        ]);

        if ($request->hasAny(['classroom_id', 'student_id'])) {
            if (!$request->filled('classroom_id') || !$request->filled('student_id')) {
                return $this->error('Sınıf ve öğrenci birlikte gönderilmelidir.', [], 422);
            }

            $classroomId = (int) $request->classroom_id;
            $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);

            if (!empty($allowedClassroomIds) && !in_array($classroomId, $allowedClassroomIds, true)) {
                return $this->error('Bu sınıfa erişim yetkiniz yok.', [], 403);
            }

            $classroom = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $user->tenant_id)
                ->find($classroomId);

            if (!$classroom) {
                return $this->error('Sınıf bulunamadı.', [], 404);
            }

            $student = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $user->tenant_id)
                ->where('classroom_id', $classroomId)
                ->find($request->student_id);

            if (!$student) {
                return $this->error('Öğrenci seçilen sınıfta bulunamadı.', [], 422);
            }
        }

        $meeting->update($request->only([
            'student_id',
            'meeting_with',
            'title',
            'content',
            'meeting_date',
            'meeting_time',
            'visibility',
            'status',
        ]));

        $meeting->load(['student' => fn($q) => $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with(['classroom' => fn($cq) => $cq->withoutGlobalScope(\App\Scopes\SeasonScope::class)->with(['educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class)])])]);

        return $this->success([
            'meeting' => $this->formatMeeting($meeting),
        ], 'Kayıt başarıyla güncellendi.');
    }

    /**
     * Sil
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();

        $meeting = TeacherMeeting::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $user->id)
            ->find($id);

        if (!$meeting) {
            return $this->error('Kayıt bulunamadı.', [], 404);
        }

        $meeting->delete();

        return $this->success([], 'Kayıt başarıyla silindi.');
    }

    /**
     * Öğretmenin yetkili sınıfları (randevu modalı için)
     */
    public function classrooms(Request $request): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();
        $teacherId = (int) $user->id;
        $roleName = $this->resolveRoleName($user);
        $isGuidance = $this->isGuidanceOrAdminRole($roleName);

        $activeSeasonId = $request->input('season_id')
            ?? $request->header('X-Season-Id')
            ?? $this->getCurrentSeasonId()
            ?? \App\Models\Season::where('tenant_id', $user->tenant_id)->where('is_active', true)->value('id');

        // Aktif sezonun sınıflarını çek
        $seasonClassroomsQuery = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->with(['educationLevel' => fn($el) => $el->withoutGlobalScope(\App\Scopes\SeasonScope::class)]);

        if ($activeSeasonId) {
            // Öncelikle sadece aktif sezona ait sınıflar
            $seasonClassrooms = (clone $seasonClassroomsQuery)
                ->where('season_id', $activeSeasonId)
                ->orderBy('name')
                ->get();

            // Eğer aktif sezonda hiç sınıf kaydı bulunamazsa fallback olarak genel sınıfları al
            if ($seasonClassrooms->isEmpty()) {
                $seasonClassrooms = $seasonClassroomsQuery->orderBy('name')->get();
            }
        } else {
            $seasonClassrooms = $seasonClassroomsQuery->orderBy('name')->get();
        }

        if ($isGuidance) {
            // Rehber öğretmen veya yönetici doğrudan aktif sezonun tüm sınıflarını görür
            $allClassrooms = $seasonClassrooms;
        } else {
            // Branş/sınıf öğretmeni: Aktif sezondaki ders programı ve sınıf öğretmenliği
            $scheduleClassroomIds = Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->forTeacher($teacherId)
                ->when($activeSeasonId, fn($q) => $q->where('season_id', $activeSeasonId))
                ->whereNotNull('classroom_id')
                ->pluck('classroom_id');

            $directClassroomIds = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $user->tenant_id)
                ->where('teacher_id', $teacherId)
                ->when($activeSeasonId, fn($q) => $q->where('season_id', $activeSeasonId))
                ->pluck('id');

            $assignedIds = $scheduleClassroomIds->merge($directClassroomIds)->filter()->unique()->values()->all();

            if (!empty($assignedIds)) {
                $allClassrooms = $seasonClassrooms->whereIn('id', $assignedIds)->values();
                if ($allClassrooms->isEmpty()) {
                    $allClassrooms = $seasonClassrooms;
                }
            } else {
                $allClassrooms = $seasonClassrooms;
            }
        }

        // İsimlerine göre alfabetik sırala
        $sorted = $allClassrooms->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();

        $classrooms = $sorted->map(fn($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'education_level' => $c->educationLevel ? $c->educationLevel->name : null,
        ]);

        $debug = [
            'user_id' => $user->id,
            'role_id' => $user->role_id ?? null,
            'role_name' => $roleName,
            'is_guidance' => $isGuidance,
            'tenant_id' => $user->tenant_id,
            'active_season_id' => $activeSeasonId,
            'season_classrooms_found' => $seasonClassrooms->count(),
            'result_classrooms_count' => $classrooms->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'İşlem başarılı.',
            'data' => [
                'classrooms' => $classrooms,
                'debug' => $debug,
            ],
        ]);
    }

    /**
     * Sınıftaki öğrenciler (randevu modalı için)
     */
    public function classroomStudents(Request $request, int $classroomId): JsonResponse
    {
        if ($guard = $this->ensureTeacherUser($request)) {
            return $guard;
        }

        $user = $request->user();
        $allowedIds = $this->teacherAllowedClassroomIds($user);

        if (!empty($allowedIds) && !in_array($classroomId, $allowedIds, true)) {
            return $this->error('Bu sınıfa erişim yetkiniz yok.', [], 403);
        }

        $students = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $user->tenant_id)
            ->where('classroom_id', $classroomId)
            ->orderBy('name')
            ->get(['id', 'name', 'school_no', 'classroom_id']);

        return $this->success(['students' => $students]);
    }

    private function formatMeeting($m): array
    {
        $student = $m->student;
        $classroom = $student?->classroom;
        $educationLevel = $classroom?->educationLevel;

        $classroomLabel = null;
        if ($educationLevel && $classroom) {
            $classroomLabel = $educationLevel->name . ' - ' . $classroom->name;
        } elseif ($classroom) {
            $classroomLabel = $classroom->name;
        }

        return [
            'id' => $m->id,
            'type' => $m->type,
            'meeting_with' => $m->meeting_with,
            'title' => $m->title,
            'content' => $m->content,
            'meeting_date' => $m->meeting_date instanceof \Carbon\Carbon
                ? $m->meeting_date->format('Y-m-d')
                : ($m->meeting_date ? (string) $m->meeting_date : null),
            'meeting_time' => $m->meeting_time,
            'visibility' => $m->visibility,
            'status' => $m->status,
            'student' => $student ? [
                'id' => $student->id,
                'name' => $student->name,
                'school_no' => $student->school_no,
                'classroom_id' => $student->classroom_id,
            ] : null,
            'classroom_label' => $classroomLabel,
            'created_at' => $m->created_at?->toIso8601String(),
            'updated_at' => $m->updated_at?->toIso8601String(),
        ];
    }
}
