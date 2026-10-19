<?php

namespace App\Http\Controllers;

use App\Actions\CreateHomeworkAction;
use App\Actions\CreateHomeworkSubmissionAction;
use App\Actions\UpdateHomeworkAction;
use App\Actions\UpdateHomeworkSubmissionAction;
use App\Http\Requests\StoreHomeworkRequest;
use App\Http\Requests\StoreHomeworkSubmissionRequest;
use App\Http\Requests\UpdateHomeworkRequest;
use App\Http\Requests\UpdateHomeworkSubmissionRequest;
use App\Http\Resources\HomeworkResource;
use App\Models\Homework;
use App\Models\HomeworkStudentAssignment;
use App\Models\HomeworkSubmission;
use App\Models\Schedule;
use App\Models\Lesson;
use App\Models\Classroom;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class HomeworkController extends ApiController
{
    private const TEACHER_ONLY_ROLES = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'teacher'];
    private const REVIEW_STATUSES = ['done', 'not_done', 'partial', 'completed', 'absent'];

    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    private function isTeacherOnlyRole($user): bool
    {
        if (!$user) {
            return false;
        }

        if (is_object($user)) {
            if (!empty($user->role_id) && in_array((int) $user->role_id, [5, 6], true)) {
                return true;
            }
            $roleName = $user->role ? $user->role->name : null;
        } else {
            $roleName = (string) $user;
        }

        if (!$roleName) {
            return false;
        }

        $normalized = mb_strtolower(trim($roleName), 'UTF-8');
        $teacherRoles = [
            'öğretmen', 'sınıf öğretmeni', 'rehberlik', 'guidance',
            'rehber öğretmen', 'rehber_teacher', 'guidance_teacher',
            'teacher', 'class_teacher',
        ];

        return in_array($normalized, $teacherRoles, true);
    }

    private function teacherSchedulesQuery($user)
    {
        return Schedule::query()
            ->where('tenant_id', $user->tenant_id)
            ->forTeacher($user->id);
    }

    private function ensureTeacherScope($user, int $lessonId, ?int $classroomId): ?JsonResponse
    {
        $teacherSchedules = $this->teacherSchedulesQuery($user);

        if (!(clone $teacherSchedules)->where('lesson_id', $lessonId)->exists()) {
            return $this->error('Bu ders için ödev oluşturma yetkiniz yok.', [], 403);
        }

        if ($classroomId && !(clone $teacherSchedules)->where('classroom_id', $classroomId)->exists()) {
            return $this->error('Bu sınıf için ödev oluşturma yetkiniz yok.', [], 403);
        }

        if ($classroomId && !(clone $teacherSchedules)
            ->where('lesson_id', $lessonId)
            ->where('classroom_id', $classroomId)
            ->exists()) {
            return $this->error('Bu ders-sınıf eşleşmesi için ödev oluşturma yetkiniz yok.', [], 403);
        }

        return null;
    }

    private function resolveAssignedStudentIds(int $tenantId, ?int $classroomId, string $assignmentMode, array $selectedStudentIds = []): array
    {
        if (! $classroomId) {
            throw new \RuntimeException('Öğrenci ataması için sınıf seçimi zorunludur.');
        }

        $studentsQuery = Student::query()
            ->where('tenant_id', $tenantId)
            ->where('classroom_id', $classroomId);

        if ($assignmentMode === 'selected_students') {
            $selectedStudentIds = array_values(array_unique(array_map('intval', $selectedStudentIds)));
            if (empty($selectedStudentIds)) {
                throw new \RuntimeException('Seçili öğrenciler için en az bir öğrenci seçmelisiniz.');
            }

            $validIds = $studentsQuery
                ->whereIn('id', $selectedStudentIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            if (count($validIds) !== count($selectedStudentIds)) {
                throw new \RuntimeException('Seçilen öğrencilerden bazıları sınıf ile uyumlu değil.');
            }

            return $validIds;
        }

        return $studentsQuery
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function syncAssignments(Homework $homework, array $studentIds): void
    {
        $studentIds = array_values(array_unique(array_map('intval', $studentIds)));

        HomeworkStudentAssignment::query()
            ->where('homework_id', $homework->id)
            ->whereNotIn('student_id', $studentIds)
            ->delete();

        foreach ($studentIds as $studentId) {
            HomeworkStudentAssignment::query()->updateOrCreate(
                [
                    'homework_id' => $homework->id,
                    'student_id' => $studentId,
                ],
                [
                    'tenant_id' => $homework->tenant_id,
                ]
            );
        }
    }

    /**
     * Homework create form options (lesson/classroom).
     * Teacher users only receive lessons and classrooms assigned in their schedules.
     */
    public function createOptions(Request $request): JsonResponse
    {
        Gate::authorize('create', Homework::class);

        $user = auth()->user();
        $isTeacherOnly = $this->isTeacherOnlyRole($user);

        $lessonsQuery = Lesson::query()
            ->where('tenant_id', $user->tenant_id)
            ->orderBy('name');

        $classroomsQuery = Classroom::query()
            ->where('tenant_id', $user->tenant_id)
            ->orderBy('name');

        $lessonClassroomsMap = [];

        if ($isTeacherOnly) {
            // Tek sorguda hem lesson_id hem classroom_id alınır (timeout önleme)
            $scheduleData = $this->teacherSchedulesQuery($user)
                ->select(['lesson_id', 'classroom_id'])
                ->whereNotNull('lesson_id')
                ->whereNotNull('classroom_id')
                ->distinct()
                ->get();

            $lessonIds = $scheduleData->pluck('lesson_id')
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values();

            $classroomIds = $scheduleData->pluck('classroom_id')
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values();

            foreach ($scheduleData as $row) {
                $lid = (int) $row->lesson_id;
                $cid = (int) $row->classroom_id;
                if ($lid > 0 && $cid > 0) {
                    if (!isset($lessonClassroomsMap[$lid])) {
                        $lessonClassroomsMap[$lid] = [];
                    }
                    if (!in_array($cid, $lessonClassroomsMap[$lid], true)) {
                        $lessonClassroomsMap[$lid][] = $cid;
                    }
                }
            }

            $lessonsQuery->whereIn('id', $lessonIds->all());

            if ($request->filled('lesson_id')) {
                $reqLessonId = (int) $request->input('lesson_id');
                $allowedCids = $lessonClassroomsMap[$reqLessonId] ?? [];
                $classroomsQuery->whereIn('id', $allowedCids);
            } else {
                $classroomsQuery->whereIn('id', $classroomIds->all());
            }
        } else {
            $allSchedules = Schedule::query()
                ->where('tenant_id', $user->tenant_id)
                ->select(['lesson_id', 'classroom_id'])
                ->whereNotNull('lesson_id')
                ->whereNotNull('classroom_id')
                ->distinct()
                ->get();

            foreach ($allSchedules as $row) {
                $lid = (int) $row->lesson_id;
                $cid = (int) $row->classroom_id;
                if ($lid > 0 && $cid > 0) {
                    if (!isset($lessonClassroomsMap[$lid])) {
                        $lessonClassroomsMap[$lid] = [];
                    }
                    if (!in_array($cid, $lessonClassroomsMap[$lid], true)) {
                        $lessonClassroomsMap[$lid][] = $cid;
                    }
                }
            }

            if ($request->filled('lesson_id')) {
                $reqLessonId = (int) $request->input('lesson_id');
                $allowedCids = $lessonClassroomsMap[$reqLessonId] ?? [];
                if (!empty($allowedCids)) {
                    $classroomsQuery->whereIn('id', $allowedCids);
                }
            }
        }

        return $this->success([
            'lessons' => $lessonsQuery->get(['id', 'name']),
            'classrooms' => $classroomsQuery->get(['id', 'name']),
            'lesson_classrooms' => $lessonClassroomsMap,
            'teacher_scoped' => $isTeacherOnly,
        ], 'Ödev form seçenekleri getirildi.');
    }

    /**
     * Get classroom students for assignment selection.
     */
    public function classroomStudents(Classroom $classroom): JsonResponse
    {
        Gate::authorize('create', Homework::class);

        $user = auth()->user();
        if ((int) $classroom->tenant_id !== (int) $user->tenant_id) {
            return $this->error('Sınıf bulunamadı.', [], 404);
        }

        if ($this->isTeacherOnlyRole($user)) {
            $allowed = $this->teacherSchedulesQuery($user)
                ->where('classroom_id', $classroom->id)
                ->exists();

            if (! $allowed) {
                return $this->error('Bu sınıf öğrencilerine erişim yetkiniz yok.', [], 403);
            }
        }

        $students = Student::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('classroom_id', $classroom->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'school_no']);

        return $this->success([
            'students' => $students,
        ], 'Sınıf öğrencileri başarıyla getirildi.');
    }

    /**
     * Get homework control list (assigned students + review values).
     */
    public function control(Homework $homework): JsonResponse
    {
        Gate::authorize('update', $homework);

        $homework->load([
            'lesson:id,name',
            'classroom:id,name',
            'assignments.student:id,name,school_no',
        ]);

        return $this->success([
            'homework' => [
                'id' => $homework->id,
                'title' => $homework->title,
                'assignment_mode' => $homework->assignment_mode,
                'lesson' => $homework->lesson,
                'classroom' => $homework->classroom,
                'due_date' => $homework->due_date ? \Illuminate\Support\Carbon::parse($homework->due_date)->format('Y-m-d') : null,
            ],
            'review_status_options' => self::REVIEW_STATUSES,
            'students' => $homework->assignments
                ->sortBy(fn ($item) => mb_strtolower((string) ($item->student?->name ?? ''), 'UTF-8'))
                ->values()
                ->map(function ($assignment) {
                    return [
                        'student_id' => $assignment->student_id,
                        'student_name' => $assignment->student?->name,
                        'school_no' => $assignment->student?->school_no,
                        'review_status' => $assignment->review_status,
                        'teacher_note' => $assignment->teacher_note,
                        'reviewed_at' => $assignment->reviewed_at?->format('Y-m-d H:i:s'),
                    ];
                }),
        ], 'Ödev kontrol listesi başarıyla getirildi.');
    }

    /**
     * Save homework control values for assigned students.
     */
    public function saveControl(Request $request, Homework $homework): JsonResponse
    {
        Gate::authorize('update', $homework);

        $rawEntries = $request->input('entries');
        if (is_array($rawEntries)) {
            $statusMap = [
                'yaptı' => 'done',
                'yapıldı' => 'done',
                'yapildi' => 'done',
                'yapılmadı' => 'not_done',
                'yapilmadi' => 'not_done',
                'eksik' => 'partial',
                'tamamlandı' => 'completed',
                'tamamlandi' => 'completed',
                'gelmedi' => 'absent',
            ];
            $allowed = ['done', 'not_done', 'partial', 'completed', 'absent', 'missing'];

            foreach ($rawEntries as $idx => $entry) {
                if (isset($entry['review_status'])) {
                    $raw = trim((string) $entry['review_status']);
                    $lower = mb_strtolower($raw, 'UTF-8');
                    if (isset($statusMap[$lower])) {
                        $raw = $statusMap[$lower];
                    }
                    if ($raw === '' || $raw === 'null' || $raw === 'none' || $raw === 'pending' || $raw === 'submitted' || $raw === 'waiting') {
                        $rawEntries[$idx]['review_status'] = null;
                    } elseif (in_array($raw, $allowed, true)) {
                        $rawEntries[$idx]['review_status'] = $raw;
                    } else {
                        $rawEntries[$idx]['review_status'] = null;
                    }
                }
            }
            $request->merge(['entries' => $rawEntries]);
        }

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'entries.*.review_status' => ['nullable', 'string', 'in:done,not_done,partial,completed,absent,missing'],
            'entries.*.teacher_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $entries = collect($validated['entries']);
        $studentIds = $entries->pluck('student_id')->map(fn ($id) => (int) $id)->unique()->values();

        $assignments = HomeworkStudentAssignment::query()
            ->where('homework_id', $homework->id)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy('student_id');

        if ($assignments->count() !== $studentIds->count()) {
            return $this->error('Bazı öğrenciler bu ödeve atanmış değil.', [], 422);
        }

        DB::transaction(function () use ($entries, $assignments, $homework, $request) {
            $reviewerId = auth()->id();
            foreach ($entries as $entry) {
                /** @var HomeworkStudentAssignment $assignment */
                $assignment = $assignments[(int) $entry['student_id']];
                $status = $entry['review_status'] ?? null;
                $teacherNote = array_key_exists('teacher_note', $entry)
                    ? trim((string) ($entry['teacher_note'] ?? ''))
                    : null;

                $assignment->review_status = $status;
                $assignment->teacher_note = $teacherNote === '' ? null : $teacherNote;
                $assignment->reviewed_by = $status || $assignment->teacher_note ? $reviewerId : null;
                $assignment->reviewed_at = $status || $assignment->teacher_note ? now() : null;
                $assignment->save();
            }

            $totalAssignments = HomeworkStudentAssignment::where('homework_id', $homework->id)->count();
            $reviewedAssignments = HomeworkStudentAssignment::where('homework_id', $homework->id)
                ->whereNotNull('review_status')
                ->where('review_status', '!=', '')
                ->count();

            $forceArchive = $request->boolean('force_archive', false);
            $isFullyReviewed = ($totalAssignments > 0 && $reviewedAssignments >= $totalAssignments);

            // Tüm öğrenciler değerlendirildiyse veya öğretmen zorla arşive al dediyse arşive taşı
            $homework->is_checked = ($isFullyReviewed || $forceArchive);
            $homework->save();
        });

        $isArchived = (bool) ($homework->fresh()->is_checked ?? false);
        $message = $isArchived
            ? 'Ödev kontrolü tamamlandı ve arşive aktarıldı.'
            : 'Ödev kontrolleri kaydedildi. Kontrol edilmeyen öğrenciler olduğu için bekleyenlerde tutuluyor.';

        return $this->success(['is_checked' => $isArchived], $message);
    }

    /**
     * Ödevi arşive kaldır veya arşivden çıkar (manuel kontrol).
     */
    public function toggleArchive(Homework $homework): JsonResponse
    {
        Gate::authorize('update', $homework);

        $homework->is_checked = ! (bool) $homework->is_checked;
        $homework->save();

        $isArchived = (bool) ($homework->is_checked ?? false);
        $message = $isArchived ? 'Ödev arşive kaldırıldı.' : 'Ödev arşivden çıkarıldı, bekleyenlere alındı.';

        return $this->success([
            'id' => $homework->id,
            'is_checked' => $isArchived,
        ], $message);
    }

    /**
     * Display a listing of homeworks.
     * Kurucu/Müdür/Müdür Yardımcısı: kademe, sınıf, kampüs (Kurucu), öğrenci adı ile filtreleyebilir; öğretmenler sadece kendi ödevlerini görür.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Homework::class);

        $user = auth()->user();
        $roleName = $user->role ? $user->role->name : null;
        $isTeacher = $this->isTeacherOnlyRole($user);
        $isManager = in_array($roleName, ['owner', 'Kurucu', 'Kurum Sahibi', 'institution_owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        $query = Homework::with(['lesson', 'classroom.educationLevel', 'teacher', 'file'])
            ->withCount([
                'assignments',
                'assignments as submissions_count',
                'assignments as graded_count' => fn ($q) => $q->whereNotNull('review_status'),
                'assignments as checked_assignments_count' => fn ($q) => $q->whereNotNull('review_status'),
            ])
            ->withMax('assignments', 'reviewed_at')
            ->withCount(['assignments as has_teacher_notes_count' => fn ($q) => $q->whereNotNull('teacher_note')->where('teacher_note', '!=', '')]);

        // Row-level security: Öğretmen kendi oluşturduğu ödevleri ve ders programında atandığı (ana veya yardımcı öğretmen olduğu) sınıfların ödevlerini görür
        if ($isTeacher) {
            $isCheckingExisting = request()->boolean('check_existing') && request()->filled('classroom_id') && request()->filled('due_date_from');
            if (!$isCheckingExisting) {
                $scheduleData = $this->teacherSchedulesQuery($user)
                    ->select(['lesson_id', 'classroom_id'])
                    ->whereNotNull('lesson_id')
                    ->whereNotNull('classroom_id')
                    ->distinct()
                    ->get();

                $query->where(function ($q) use ($user, $scheduleData) {
                    $q->where('teacher_id', $user->id);
                    foreach ($scheduleData as $s) {
                        $q->orWhere(function ($sq) use ($s) {
                            $sq->where('lesson_id', $s->lesson_id)
                               ->where('classroom_id', $s->classroom_id);
                        });
                    }
                });
            }
        } else {
            // Kurucu/owner: tüm kurum; Müdür/Müdür Yardımcısı: atandığı kampüs ve kademeler
            if ($isManager && in_array($roleName, ['Müdür', 'Müdür Yardımcısı'], true)) {
                $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
                $query->whereHas('classroom', function ($q) use ($campusIds, $educationLevelIds) {
                    if (! empty($campusIds)) {
                        $q->whereHas('educationLevel', fn ($qEl) => $qEl->whereIn('campus_id', $campusIds));
                    }
                    if (! empty($educationLevelIds)) {
                        $q->whereIn('grade_level', $educationLevelIds);
                    }
                });
            }
        }

        // Filtreleme (tüm yetkili roller)
        if (request()->filled('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }
        if (request()->filled('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }
        if (request()->filled('teacher_id')) {
            $query->where('teacher_id', request('teacher_id'));
        }
        if (request()->filled('due_date_from')) {
            $query->where('due_date', '>=', request('due_date_from'));
        }
        if (request()->filled('due_date_to')) {
            $query->where('due_date', '<=', request('due_date_to'));
        }
        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }
        if (request()->has('is_checked')) {
            $isChecked = filter_var(request('is_checked'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_checked', $isChecked);
        }

        // Kurucu/Müdür takip filtreleri
        if (request()->filled('campus_id')) {
            $query->whereHas('classroom.educationLevel', fn ($q) => $q->where('campus_id', (int) request('campus_id')));
        }
        if (request()->filled('education_level_id')) {
            $query->whereHas('classroom', fn ($q) => $q->where('grade_level', request('education_level_id')));
        }
        if (request()->filled('student_name')) {
            $term = trim(request('student_name'));
            if ($term !== '') {
                $query->whereHas('assignments.student', fn ($q) => $q->where('name', 'like', '%'.$term.'%'));
            }
        }

        $query->orderBy('due_date', 'asc');

        $homeworks = $query->paginate(request('per_page', 50));

        // İstatistikler (Öğretmenler dahil tüm roller için hesaplanır)
        $statsQuery = Homework::query()->where('tenant_id', $user->tenant_id);
        if ($isTeacher) {
            $scheduleData = $this->teacherSchedulesQuery($user)
                ->select(['lesson_id', 'classroom_id'])
                ->whereNotNull('lesson_id')
                ->whereNotNull('classroom_id')
                ->distinct()
                ->get();

            $statsQuery->where(function ($q) use ($user, $scheduleData) {
                $q->where('teacher_id', $user->id);
                foreach ($scheduleData as $s) {
                    $q->orWhere(function ($sq) use ($s) {
                        $sq->where('lesson_id', $s->lesson_id)
                           ->where('classroom_id', $s->classroom_id);
                    });
                }
            });
        } elseif ($isManager && in_array($roleName, ['Müdür', 'Müdür Yardımcısı'], true)) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
            $statsQuery->whereHas('classroom', function ($q) use ($campusIds, $educationLevelIds) {
                if (! empty($campusIds)) {
                    $q->whereHas('educationLevel', fn ($qEl) => $qEl->whereIn('campus_id', $campusIds));
                }
                if (! empty($educationLevelIds)) {
                    $q->whereIn('grade_level', $educationLevelIds);
                }
            });
        }

        if (request()->filled('campus_id')) {
            $statsQuery->whereHas('classroom.educationLevel', fn ($q) => $q->where('campus_id', (int) request('campus_id')));
        }
        if (request()->filled('education_level_id')) {
            $statsQuery->whereHas('classroom', fn ($q) => $q->where('grade_level', request('education_level_id')));
        }
        if (request()->filled('classroom_id')) {
            $statsQuery->where('classroom_id', request('classroom_id'));
        }
        if (request()->filled('teacher_id')) {
            $statsQuery->where('teacher_id', request('teacher_id'));
        }
        if (request()->filled('student_name')) {
            $term = trim(request('student_name'));
            if ($term !== '') {
                $statsQuery->whereHas('assignments.student', fn ($q) => $q->where('name', 'like', '%'.$term.'%'));
            }
        }

        $totalHomeworks = (clone $statsQuery)->count();
        $pendingHomeworksCount = (clone $statsQuery)->where('is_checked', false)->count();
        $archivedHomeworksCount = (clone $statsQuery)->where('is_checked', true)->count();

        $subQuery = (clone $statsQuery)->select('id');
        $totalSubmissions = HomeworkStudentAssignment::whereIn('homework_id', $subQuery)->count();
        $gradedSubmissions = HomeworkStudentAssignment::whereIn('homework_id', (clone $statsQuery)->select('id'))->whereNotNull('review_status')->count();
        $stats = [
            'total_homeworks' => $totalHomeworks,
            'pending_homeworks_count' => $pendingHomeworksCount,
            'archived_homeworks_count' => $archivedHomeworksCount,
            'total_submissions' => $totalSubmissions,
            'graded_count' => $gradedSubmissions,
            'pending_graded' => max(0, $totalSubmissions - $gradedSubmissions),
        ];

        // Öğretmen bazlı istatistikler (sadece yöneticiler için)
        if ($isManager) {
            $teacherStatsQuery = (clone $statsQuery)->with('teacher')
                ->select('homeworks.*')
                ->withCount([
                    'assignments as submissions_count',
                    'assignments as graded_count' => fn ($q) => $q->whereNotNull('review_status'),
                ])
                ->get();
            $teacher_stats = $teacherStatsQuery->groupBy('teacher_id')->map(function ($group) {
                $first = $group->first();
                return [
                    'teacher_id' => $first->teacher_id,
                    'teacher_name' => $first->teacher?->name ?? 'Belirtilmemiş',
                    'homework_count' => $group->count(),
                    'total_submissions' => $group->sum('submissions_count'),
                    'graded_count' => (int) $group->sum('graded_count'),
                ];
            })->values()->toArray();
            $stats['teacher_stats'] = $teacher_stats;
        }

        return $this->success([
            'homeworks' => HomeworkResource::collection($homeworks),
            'pagination' => [
                'current_page' => $homeworks->currentPage(),
                'last_page' => $homeworks->lastPage(),
                'per_page' => $homeworks->perPage(),
                'total' => $homeworks->total(),
            ],
            'stats' => $stats,
        ], 'Ödevler başarıyla listelendi.');
    }

    /**
     * Store a newly created homework in storage.
     */
    public function store(StoreHomeworkRequest $request, CreateHomeworkAction $createHomeworkAction): JsonResponse
    {
        Gate::authorize('create', Homework::class);

        $user = auth()->user();
        $isTeacherOnly = $this->isTeacherOnlyRole($user);
        $validated = $request->validated();

        $lessonId = (int) $validated['lesson_id'];
        $classroomId = isset($validated['classroom_id']) ? (int) $validated['classroom_id'] : null;
        $assignmentMode = $validated['assignment_mode'] ?? 'all_class';

        if ($isTeacherOnly) {
            $scopeError = $this->ensureTeacherScope($user, $lessonId, $classroomId);
            if ($scopeError) {
                return $scopeError;
            }
        }

        try {
            $assignedStudentIds = $this->resolveAssignedStudentIds(
                (int) $user->tenant_id,
                $classroomId,
                $assignmentMode,
                (array) ($validated['assigned_student_ids'] ?? [])
            );
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), [], 422);
        }

        $validated['assignment_mode'] = $assignmentMode;

        $homework = DB::transaction(function () use ($createHomeworkAction, $validated, $assignedStudentIds) {
            $homework = $createHomeworkAction->execute($validated);
            $this->syncAssignments($homework, $assignedStudentIds);
            return $homework;
        });

        // Öğrencilere ve velilere yeni ödev push bildirimi gönder
        try {
            $homework->load('lesson');
            $lessonName = $homework->lesson?->name ?? 'Ders';
            $dueDateText = $homework->due_date ? ' (Son Teslim: ' . \Carbon\Carbon::parse($homework->due_date)->format('d.m.Y') . ')' : '';
            $title = "Yeni Ödev: {$lessonName}";
            $body = "{$homework->title}{$dueDateText}";

            if (!empty($assignedStudentIds)) {
                app(\App\Services\FcmService::class)->sendToStudents(
                    $assignedStudentIds,
                    $title,
                    $body,
                    [
                        'type' => 'homework',
                        'homeworkId' => (string) $homework->id,
                        'route' => '/homework/' . $homework->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Ödev push bildirimi gönderilemedi: ' . $e->getMessage());
        }

        return $this->success(new HomeworkResource($homework), 'Ödev başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified homework.
     */
    public function show(Homework $homework): JsonResponse
    {
        Gate::authorize('view', $homework);

        return $this->success(new HomeworkResource($homework->load(['lesson', 'classroom', 'teacher', 'file', 'assignments:homework_id,student_id'])));
    }

    /**
     * Update the specified homework in storage.
     */
    public function update(UpdateHomeworkRequest $request, Homework $homework, UpdateHomeworkAction $updateHomeworkAction): JsonResponse
    {
        Gate::authorize('update', $homework);

        $user = auth()->user();
        $isTeacherOnly = $this->isTeacherOnlyRole($user);
        $validated = $request->validated();

        $lessonId = (int) ($validated['lesson_id'] ?? $homework->lesson_id);
        $classroomId = array_key_exists('classroom_id', $validated)
            ? (isset($validated['classroom_id']) ? (int) $validated['classroom_id'] : null)
            : (isset($homework->classroom_id) ? (int) $homework->classroom_id : null);

        $assignmentMode = $validated['assignment_mode'] ?? ($homework->assignment_mode ?? 'all_class');

        if ($isTeacherOnly) {
            $scopeError = $this->ensureTeacherScope($user, $lessonId, $classroomId);
            if ($scopeError) {
                return $scopeError;
            }
        }

        $needsAssignmentSync =
            array_key_exists('assignment_mode', $validated)
            || array_key_exists('assigned_student_ids', $validated)
            || array_key_exists('classroom_id', $validated);

        if ($needsAssignmentSync
            && $assignmentMode === 'selected_students'
            && ! array_key_exists('assigned_student_ids', $validated)) {
            return $this->error('Seçili öğrenciler için öğrenci listesi göndermelisiniz.', [], 422);
        }

        try {
            $assignedStudentIds = $needsAssignmentSync
                ? $this->resolveAssignedStudentIds(
                    (int) $user->tenant_id,
                    $classroomId,
                    $assignmentMode,
                    (array) ($validated['assigned_student_ids'] ?? [])
                )
                : $homework->assignments()->pluck('student_id')->map(fn ($id) => (int) $id)->all();
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), [], 422);
        }

        $updatedHomework = DB::transaction(function () use ($updateHomeworkAction, $homework, $validated, $needsAssignmentSync, $assignedStudentIds) {
            $updatedHomework = $updateHomeworkAction->execute($homework, $validated);
            if ($needsAssignmentSync) {
                $this->syncAssignments($updatedHomework, $assignedStudentIds);
            }
            return $updatedHomework;
        });

        return $this->success(new HomeworkResource($updatedHomework), 'Ödev başarıyla güncellendi.');
    }

    /**
     * Remove the specified homework from storage.
     */
    public function destroy(Homework $homework): JsonResponse
    {
        Gate::authorize('delete', $homework);

        $this->activityLogService->logDelete($homework);
        $homework->delete();

        return $this->success(null, 'Ödev başarıyla silindi.');
    }

    /**
     * Submit homework (student).
     */
    public function submit(StoreHomeworkSubmissionRequest $request, CreateHomeworkSubmissionAction $createHomeworkSubmissionAction): JsonResponse
    {
        Gate::authorize('create', HomeworkSubmission::class);

        try {
            $submission = $createHomeworkSubmissionAction->execute($request->validated());

            return $this->success([
                'submission' => [
                    'id' => $submission->id,
                    'homework_id' => $submission->homework_id,
                    'status' => $submission->status,
                    'submitted_at' => $submission->submitted_at?->format('Y-m-d H:i:s'),
                ],
            ], 'Ödev başarıyla gönderildi.', 201);
        } catch (\Exception $e) {
            return $this->error('Ödev gönderilirken bir hata oluştu: ' . $e->getMessage(), [], 422);
        }
    }

    /**
     * Grade homework submission (teacher).
     */
    public function grade(UpdateHomeworkSubmissionRequest $request, HomeworkSubmission $submission, UpdateHomeworkSubmissionAction $updateHomeworkSubmissionAction): JsonResponse
    {
        Gate::authorize('update', $submission);

        try {
            $updatedSubmission = $updateHomeworkSubmissionAction->execute($submission, $request->validated());

            return $this->success([
                'submission' => [
                    'id' => $updatedSubmission->id,
                    'score' => $updatedSubmission->score,
                    'status' => $updatedSubmission->status,
                    'graded_at' => $updatedSubmission->graded_at?->format('Y-m-d H:i:s'),
                ],
            ], 'Ödev başarıyla değerlendirildi.');
        } catch (\Exception $e) {
            return $this->error('Ödev değerlendirilirken bir hata oluştu: ' . $e->getMessage(), [], 422);
        }
    }

    /**
     * Get student homework performance statistics.
     */
    public function studentPerformance(int $studentId): JsonResponse
    {
        Gate::authorize('viewAny', HomeworkSubmission::class);

        $dateFrom = request('date_from', now()->startOfMonth()->toDateString());
        $dateTo = request('date_to', now()->toDateString());

        $submissions = HomeworkSubmission::where('student_id', $studentId)
            ->whereHas('homework', function ($q) use ($dateFrom, $dateTo) {
                $q->whereBetween('due_date', [$dateFrom, $dateTo]);
            })
            ->with('homework')
            ->get();

        $total = $submissions->count();
        $submitted = $submissions->where('status', '!=', 'pending')->count();
        $graded = $submissions->where('status', 'graded')->count();
        $averageScore = $submissions->whereNotNull('score')->avg('score');

        return $this->success([
            'student_id' => $studentId,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'statistics' => [
                'total_homeworks' => $total,
                'submitted_count' => $submitted,
                'graded_count' => $graded,
                'pending_count' => $total - $submitted,
                'average_score' => $averageScore ? round($averageScore, 2) : null,
                'submission_rate' => $total > 0 ? round(($submitted / $total) * 100, 2) : 0,
            ],
        ], 'Öğrenci ödev performans istatistikleri başarıyla getirildi.');
    }

    /**
     * Get teacher homework performance statistics.
     */
    public function teacherPerformance(int $teacherId): JsonResponse
    {
        Gate::authorize('viewAny', Homework::class);

        $dateFrom = request('date_from', now()->startOfMonth()->toDateString());
        $dateTo = request('date_to', now()->toDateString());

        $homeworks = Homework::where('teacher_id', $teacherId)
            ->whereBetween('due_date', [$dateFrom, $dateTo])
            ->with('submissions')
            ->get();

        $totalHomeworks = $homeworks->count();
        $totalSubmissions = $homeworks->sum(fn ($h) => $h->submissions->count());
        $gradedSubmissions = $homeworks->sum(fn ($h) => $h->submissions->where('status', 'graded')->count());
        $averageScore = $homeworks->flatMap->submissions->whereNotNull('score')->avg('score');

        return $this->success([
            'teacher_id' => $teacherId,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'statistics' => [
                'total_homeworks' => $totalHomeworks,
                'total_submissions' => $totalSubmissions,
                'graded_submissions' => $gradedSubmissions,
                'pending_grading' => $totalSubmissions - $gradedSubmissions,
                'average_score' => $averageScore ? round($averageScore, 2) : null,
                'grading_rate' => $totalSubmissions > 0 ? round(($gradedSubmissions / $totalSubmissions) * 100, 2) : 0,
            ],
        ], 'Öğretmen ödev performans istatistikleri başarıyla getirildi.');
    }
}
