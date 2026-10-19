<?php

namespace App\Http\Controllers;

use App\Actions\BulkCreateAttendanceAction;
use App\Actions\CreateAttendanceAction;
use App\Actions\UpdateAttendanceAction;
use App\Http\Requests\BulkAttendanceRequest;
use App\Http\Requests\StoreAttendanceRequest;
use App\Http\Requests\UpdateAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Schedule;
use App\Services\ActivityLogService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AttendanceController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Günlük yoklama takip verisi (Yoklama Takibi sayfası için).
     * Tarihe göre o günkü dersleri, yoklama alınıp alınmadığını, devamsız öğrencileri döndürür.
     */
    public function dailyTracking(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Attendance::class);

        $user = auth()->user();
        $tenantId = $user->tenant_id ?? null;
        if (!$tenantId) {
            return $this->error('Kurum bilgisi bulunamadı.', [], 400);
        }

        $date           = Carbon::parse($request->input('date', now()->toDateString()))->toDateString();
        $dayStart       = Carbon::parse($date)->startOfDay();
        $dayEnd         = Carbon::parse($date)->endOfDay();
        $educationLevelId = $request->input('education_level_id') ? (int) $request->input('education_level_id') : null;
        if (!$educationLevelId && $user) {
            $userLevels = array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? []))));
            if (count($userLevels) === 1) {
                $educationLevelId = $userLevels[0];
            } else if (empty($userLevels)) {
                $tenantLevels = \App\Models\EducationLevel::where('tenant_id', $tenantId)->pluck('id')->all();
                if (count($tenantLevels) === 1) {
                    $educationLevelId = $tenantLevels[0];
                }
            }
        }

        $dayOfWeek = strtolower(Carbon::parse($date)->locale('en')->dayName);
        $map       = ['Monday' => 'Pazartesi', 'Tuesday' => 'Salı', 'Wednesday' => 'Çarşamba',
                      'Thursday' => 'Perşembe', 'Friday' => 'Cuma', 'Saturday' => 'Cumartesi', 'Sunday' => 'Pazar'];
        $gunAdi    = $map[Carbon::parse($date)->locale('en')->dayName] ?? $date;
        $haftaSonu = in_array($dayOfWeek, ['saturday', 'sunday'], true);

        $isTeacherOnly = $this->resolveIsTeacherOnly($user);

        // Yönetim rolü ve kademe seçimi gerekiyor ise erken dön
        if ($this->requiresEducationLevelSelection($user, $isTeacherOnly, $educationLevelId)) {
            return $this->success([
                'gun'                     => $gunAdi,
                'tarih'                   => $date,
                'hafta_sonu'              => $haftaSonu,
                'dersler'                 => [],
                'istatistikler'           => ['toplam_ders' => 0, 'alinan_yoklama' => 0, 'toplam_devamsiz_ogrenci' => 0],
                'toplam_devamsiz_ogrenci' => 0,
                'gelmeyen_ogrenciler'     => [],
                'kademe_secimi_gerekli'   => true,
            ], 'Yoklama takibi için kademe seçin.');
        }

        // Ders programı sorgusu
        $scheduleQuery = Schedule::with(['classroom.educationLevel', 'classroom.branch', 'lesson', 'teacher'])
            ->where('tenant_id', $tenantId)
            ->where('day_of_week', $dayOfWeek)
            ->orderBy('start_time');

        $this->applyDailyScheduleFilters($scheduleQuery, $user, $isTeacherOnly, $educationLevelId);

        $schedules = $scheduleQuery->get();
        $dersler   = $this->buildDailyLessons($schedules, $dayStart, $dayEnd);

        $istatistikler = [
            'toplam_ders'   => count($dersler),
            'alinan_yoklama' => collect($dersler)->where('yoklama_alindi', true)->count(),
        ];

        $absentList              = $this->buildAbsentQuery($user, $isTeacherOnly, $educationLevelId, $tenantId, $dayStart, $dayEnd)->get();
        $gelmeyenOgrenciler      = $this->buildDailyAbsentStudents($absentList, $dersler);
        $toplamDevamsizOgrenci   = collect($absentList)->pluck('student_id')->filter()->unique()->count();
        if ($toplamDevamsizOgrenci === 0 && count($gelmeyenOgrenciler) > 0) {
            $toplamDevamsizOgrenci = collect($gelmeyenOgrenciler)->pluck('okul_no')->filter()->unique()->count()
                ?: count($gelmeyenOgrenciler);
        }

        $istatistikler['toplam_devamsiz_ogrenci'] = $toplamDevamsizOgrenci;

        return $this->success([
            'gun'                     => $gunAdi,
            'tarih'                   => $date,
            'hafta_sonu'              => $haftaSonu,
            'dersler'                 => $dersler,
            'istatistikler'           => $istatistikler,
            'toplam_devamsiz_ogrenci' => $toplamDevamsizOgrenci,
            'gelmeyen_ogrenciler'     => $gelmeyenOgrenciler,
        ], 'Günlük yoklama takip verisi getirildi.');
    }

    /** Kullanıcının öğretmen rolünde olup olmadığını belirler. */
    private function resolveIsTeacherOnly($user): bool
    {
        $roleName = $user && $user->role ? trim((string) $user->role->name) : '';
        $roleId   = (int) ($user->role_id ?? 0);
        $teacherRoleNames = ['öğretmen', 'sınıf öğretmeni', 'rehberlik', 'guidance', 'rehber öğretmen',
                             'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        return in_array($roleId, [5, 6], true)
            || ($roleName !== '' && in_array(mb_strtolower($roleName, 'UTF-8'), $teacherRoleNames, true));
    }

    /** Kademe seçimi gereken yönetim rolü kontrolü. */
    private function requiresEducationLevelSelection($user, bool $isTeacherOnly, ?int $educationLevelId): bool
    {
        if ($isTeacherOnly || $educationLevelId) {
            return false;
        }
        $trackingRoles = ['owner', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'];
        $roleName = $user && $user->role ? trim((string) $user->role->name) : '';
        return $roleName !== '' && in_array($roleName, $trackingRoles, true);
    }

    /** Schedule sorgusuna erişim filtrelerini uygular. */
    private function applyDailyScheduleFilters($query, $user, bool $isTeacherOnly, ?int $educationLevelId): void
    {
        if ($isTeacherOnly) {
            $query->forTeacher((int) $user->id);
            return;
        }

        if (!$user->is_superadmin && $user->role &&
            in_array($user->role->name, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'], true)) {
            $campusIds         = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
            $query->whereHas('classroom', function ($q) use ($campusIds, $educationLevelIds) {
                if (!empty($campusIds)) {
                    $q->where(function($sq) use ($campusIds) {
                        $sq->whereIn('campus_id', $campusIds)
                           ->orWhereHas('educationLevel', fn($qEl) => $qEl->whereIn('campus_id', $campusIds));
                    });
                }
                if (!empty($educationLevelIds)) {
                    $q->where(function($sq) use ($educationLevelIds) {
                        $sq->whereIn('education_level_id', $educationLevelIds)
                           ->orWhereIn('grade_level', $educationLevelIds);
                    });
                }
            });
        }

        if ($educationLevelId) {
            $query->whereHas('classroom', fn($q) => $q->where(function($sq) use ($educationLevelId) {
                $sq->where('education_level_id', $educationLevelId)
                   ->orWhere('grade_level', $educationLevelId);
            }));
        }
    }

    /** Devamsız öğrenci sorgusunu oluşturur. */
    private function buildAbsentQuery($user, bool $isTeacherOnly, ?int $educationLevelId, int $tenantId, $dayStart, $dayEnd)
    {
        $query = Attendance::with([
            'student.classroom.educationLevel',
            'student.classroom.branch',
            'student.guardians',
            'schedule.lesson',
        ])
            ->where('tenant_id', $tenantId)
            ->whereBetween('date', [$dayStart, $dayEnd])
            ->where('status', '!=', 'present');

        if ($isTeacherOnly) {
            $query->whereHas('schedule', fn($q) => $q->forTeacher((int) $user->id));
            return $query;
        }

        if (!$user->is_superadmin && $user->role &&
            in_array($user->role->name, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'], true)) {
            $campusIds         = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
            $query->whereHas('student.classroom', function ($q) use ($campusIds, $educationLevelIds) {
                if (!empty($campusIds)) {
                    $q->where(function($sq) use ($campusIds) {
                        $sq->whereIn('campus_id', $campusIds)
                           ->orWhereHas('educationLevel', fn($qEl) => $qEl->whereIn('campus_id', $campusIds));
                    });
                }
                if (!empty($educationLevelIds)) {
                    $q->where(function($sq) use ($educationLevelIds) {
                        $sq->whereIn('education_level_id', $educationLevelIds)
                           ->orWhereIn('grade_level', $educationLevelIds);
                    });
                }
            });
        }

        if ($educationLevelId) {
            $query->whereHas('student.classroom', fn($q) => $q->where(function($sq) use ($educationLevelId) {
                $sq->where('education_level_id', $educationLevelId)
                   ->orWhere('grade_level', $educationLevelId);
            }));
        }

        return $query;
    }

    /**
     * Display a listing of attendances.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Attendance::class);

        $user = auth()->user();
        $roleName = $user && $user->role ? trim((string) $user->role->name) : '';
        $roleId = (int) ($user->role_id ?? 0);
        $teacherRoleNames = ['öğretmen', 'sınıf öğretmeni', 'rehberlik', 'guidance', 'rehber öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        $isTeacherOnly = in_array($roleId, [5, 6], true)
            || ($roleName !== '' && in_array(mb_strtolower($roleName, 'UTF-8'), $teacherRoleNames, true));

        $query = Attendance::with([
            'student',
            'schedule' => function ($q) {
                $q->with('lesson');
            },
            'teacher'
        ]);

        if ($user && $user->tenant_id) {
            $query->where('tenant_id', $user->tenant_id);
        }

        if ($isTeacherOnly) {
            // Ana öğretmen VEYA yardımcı öğretmen olarak atanmış yoklamalar
            $teacherId = (int) $user->id;
            $query->whereHas('schedule', fn($q) => $q->forTeacher($teacherId));
        }

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('classroom_id')) {
            $query->whereHas('student', function ($q) {
                $q->where('classroom_id', request('classroom_id'));
            });
        }

        if (request()->has('date_from')) {
            $query->where('date', '>=', request('date_from'));
        }

        if (request()->has('date_to')) {
            $query->where('date', '<=', request('date_to'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('schedule_id')) {
            $query->where('schedule_id', request('schedule_id'));
        }

        // Sıralama
        $query->latest('date')->latest('created_at');

        $attendances = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Attendance::count(),
            'present' => Attendance::where('status', 'present')->count(),
            'absent' => Attendance::where('status', 'absent')->count(),
            'late' => Attendance::where('status', 'late')->count(),
            'excused' => Attendance::where('status', 'excused')->count(),
        ];

        return $this->success([
            'attendances' => AttendanceResource::collection($attendances),
            'pagination' => [
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage(),
                'per_page' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
            'statistics' => $stats,
        ], 'Yoklama kayıtları başarıyla listelendi.');
    }

    /**
     * Store a newly created attendance in storage.
     */
    public function store(StoreAttendanceRequest $request, CreateAttendanceAction $createAttendanceAction): JsonResponse
    {
        Gate::authorize('create', Attendance::class);

        $attendance = $createAttendanceAction->execute($request->validated());

        return $this->success(new AttendanceResource($attendance), 'Yoklama kaydı başarıyla oluşturuldu.', 201);
    }

    /**
     * Store multiple attendance records (bulk).
     */
    public function bulkStore(BulkAttendanceRequest $request, BulkCreateAttendanceAction $bulkCreateAttendanceAction): JsonResponse
    {
        Gate::authorize('create', Attendance::class);

        $result = $bulkCreateAttendanceAction->execute($request->validated());

        return $this->success([
            'created_count' => $result['created'],
            'attendances' => AttendanceResource::collection($result['attendances']),
        ], "{$result['created']} adet yoklama kaydı başarıyla oluşturuldu.", 201);
    }

    /**
     * Display the specified attendance.
     */
    public function show(Attendance $attendance): JsonResponse
    {
        Gate::authorize('view', $attendance);

        return $this->success(new AttendanceResource($attendance->load(['student', 'schedule.lesson', 'teacher'])));
    }

    /**
     * Update the specified attendance in storage.
     */
    public function update(UpdateAttendanceRequest $request, Attendance $attendance, UpdateAttendanceAction $updateAttendanceAction): JsonResponse
    {
        Gate::authorize('update', $attendance);

        $updatedAttendance = $updateAttendanceAction->execute($attendance, $request->validated());

        return $this->success(new AttendanceResource($updatedAttendance), 'Yoklama kaydı başarıyla güncellendi.');
    }

    /**
     * Remove the specified attendance from storage.
     */
    public function destroy(Attendance $attendance): JsonResponse
    {
        Gate::authorize('delete', $attendance);

        $this->activityLogService->logDelete($attendance);
        $attendance->delete();

        return $this->success(null, 'Yoklama kaydı başarıyla silindi.');
    }

    /**
     * Get student attendance statistics.
     */
    public function studentStatistics(int $studentId): JsonResponse
    {
        Gate::authorize('viewAny', Attendance::class);

        $student = \App\Models\Student::findOrFail($studentId);

        // Tarih aralığı
        $dateFrom = request('date_from', now()->subMonths(6)->toDateString());
        $dateTo = request('date_to', now()->toDateString());

        $baseQuery = Attendance::where('student_id', $studentId)
            ->where('date', '>=', $dateFrom)
            ->where('date', '<=', $dateTo);

        $totalDays = (clone $baseQuery)->count();

        $presentDays = (clone $baseQuery)
            ->where('status', 'present')
            ->count();

        $absentDays = (clone $baseQuery)
            ->where('status', 'absent')
            ->count();

        $lateDays = (clone $baseQuery)
            ->where('status', 'late')
            ->count();

        $excusedDays = (clone $baseQuery)
            ->where('status', 'excused')
            ->count();

        $sickDays = (clone $baseQuery)
            ->where('status', 'sick')
            ->count();

        $attendanceRate = $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 2) : 0;

        return $this->success([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'school_no' => $student->school_no,
            ],
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'statistics' => [
                'total_days' => $totalDays,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'late_days' => $lateDays,
                'excused_days' => $excusedDays,
                'sick_days' => $sickDays,
                'all_absent_days' => $absentDays + $excusedDays + $sickDays,
                'attendance_rate' => $attendanceRate,
            ],
        ], 'Öğrenci devamsızlık istatistikleri başarıyla getirildi.');
    }

    /**
     * Get teacher attendance taking statistics.
     */
    public function teacherStatistics(int $teacherId): JsonResponse
    {
        Gate::authorize('viewAny', Attendance::class);

        $user = auth()->user();
        $roleName = $user && $user->role ? trim((string) $user->role->name) : '';
        $roleId = (int) ($user->role_id ?? 0);
        $teacherRoleNames = ['öğretmen', 'sınıf öğretmeni', 'rehberlik', 'guidance', 'rehber öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        $isTeacherOnly = in_array($roleId, [5, 6], true)
            || ($roleName !== '' && in_array(mb_strtolower($roleName, 'UTF-8'), $teacherRoleNames, true));
        if ($isTeacherOnly && $user && $user->id !== $teacherId) {
            return $this->error('Bu işlemi yapmaya yetkiniz yok.', [], 403);
        }

        $teacher = \App\Models\User::findOrFail($teacherId);

        // Tarih aralığı
        $dateFrom = request('date_from', now()->startOfMonth()->toDateString());
        $dateTo = request('date_to', now()->toDateString());

        $totalAttendances = Attendance::where('teacher_id', $teacherId)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->count();

        // Öğretmenin ders programındaki toplam ders sayısı (tahmini)
        $schedules = Schedule::forTeacher($teacherId)->get();
        $totalExpectedLessons = 0;

        foreach ($schedules as $schedule) {
            $days = Carbon::parse($dateFrom)->daysUntil($dateTo);
            $totalExpectedLessons += $days->count();
        }

        $attendanceTakingRate = $totalExpectedLessons > 0
            ? round(($totalAttendances / $totalExpectedLessons) * 100, 2)
            : 0;

        return $this->success([
            'teacher' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
            ],
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'statistics' => [
                'total_attendances_taken' => $totalAttendances,
                'total_expected_lessons' => $totalExpectedLessons,
                'attendance_taking_rate' => $attendanceTakingRate,
            ],
        ], 'Öğretmen yoklama alma istatistikleri başarıyla getirildi.');
    }

    /**
     * Format daily lessons list for daily tracking.
     */
    private function buildDailyLessons($schedules, $dayStart, $dayEnd): array
    {
        $dersler = [];
        $schedulesByClass = $schedules->groupBy('classroom_id');
        foreach ($schedulesByClass as $classId => $classSchedules) {
            $slotOrder = 0;
            foreach ($classSchedules as $schedule) {
                $slotOrder++;
                $classroom = $schedule->classroom;
                $sinifTamAdi = $classroom ? ($classroom->name . ($classroom->educationLevel ? ' - ' . $classroom->educationLevel->name : '')) : '-';
                $teacherName = $schedule->teacher ? (trim(($schedule->teacher->first_name ?? '') . ' ' . ($schedule->teacher->last_name ?? '')) ?: ($schedule->teacher->name ?? '-')) : '-';

                $attendanceCount = Attendance::where('schedule_id', $schedule->id)
                    ->whereBetween('date', [$dayStart, $dayEnd])
                    ->count();
                $yoklamaAlindi = $attendanceCount > 0;
                $yoklamaOzet = null;
                $gelmeyenler = [];
                if ($yoklamaAlindi) {
                    $byStatus = Attendance::where('schedule_id', $schedule->id)
                        ->whereBetween('date', [$dayStart, $dayEnd])
                        ->selectRaw('status, count(*) as cnt')
                        ->groupBy('status')
                        ->pluck('cnt', 'status')
                        ->toArray();
                    $present = (int) ($byStatus['present'] ?? 0);
                    $absent = (int) ($byStatus['absent'] ?? 0);
                    $excused = (int) ($byStatus['excused'] ?? 0);
                    $sick = (int) ($byStatus['sick'] ?? 0);
                    $late = (int) ($byStatus['late'] ?? 0);
                    $total = $present + $absent + $excused + $sick + $late;

                    $yoklamaOzet = [
                        'geldi_sayisi' => $present,
                        'gelmedi_sayisi' => $absent,
                        'izinli_sayisi' => $excused,
                        'raporlu_sayisi' => $sick,
                        'gec_sayisi' => $late,
                        // Aliases for compatibility with mobile app
                        'mevcut' => $present,
                        'gelmeyen' => $absent,
                        'izinli' => $excused,
                        'raporlu' => $sick,
                        'gec' => $late,
                        'toplam' => $total,
                    ];

                    $absentRecords = Attendance::where('schedule_id', $schedule->id)
                        ->whereBetween('date', [$dayStart, $dayEnd])
                        ->where('status', '!=', 'present')
                        ->with(['student.guardians'])
                        ->get();

                    foreach ($absentRecords as $att) {
                        $st = $att->student;
                        $guard = $st && $st->guardians->isNotEmpty() ? $st->guardians->first() : null;
                        $statusTurkish = match ($att->status) {
                            'late' => 'gec',
                            'excused' => 'izinli',
                            'sick' => 'raporlu',
                            default => 'gelmedi',
                        };
                        $gelmeyenler[] = [
                            'student_id' => $st ? $st->id : $att->student_id,
                            'student_name' => $st ? $st->name : 'Öğrenci',
                            'ogrenci_adi' => $st ? $st->name : 'Öğrenci',
                            'school_no' => $st ? $st->school_no : '',
                            'okul_no' => $st ? $st->school_no : '',
                            'status' => $att->status,
                            'durum' => $statusTurkish,
                            'veli_adi' => $guard ? $guard->name : null,
                            'veli_telefon' => $guard ? $guard->phone : null,
                        ];
                    }
                }

                $dersler[] = [
                    'schedule_id' => $schedule->id,
                    'ders_adi' => $schedule->lesson ? $schedule->lesson->name : 'Ders',
                    'sinif_tam_adi' => $sinifTamAdi,
                    'sinif_mevcudu' => $classroom ? (int) $classroom->capacity : 0,
                    'ogretmen_adi' => $teacherName,
                    'saat' => $slotOrder,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'yoklama_alindi' => $yoklamaAlindi,
                    'yoklama_ozet' => $yoklamaOzet,
                    'gelmeyenler' => $gelmeyenler,
                    'yoklama_detay' => [
                        'gelmeyenler' => $gelmeyenler,
                        'ozet' => $yoklamaOzet,
                    ],
                ];
            }
        }
        return $dersler;
    }

    /**
     * Format absent students list for daily tracking.
     */
    private function buildDailyAbsentStudents($absentList, array $dersler): array
    {
        $gelmeyenOgrenciler = [];
        $slotBySchedule = [];
        foreach ($dersler as $d) {
            $slotBySchedule[$d['schedule_id']] = $d['saat'];
        }

        foreach ($absentList as $a) {
            $student = $a->student;
            $classroom = $student && $student->classroom ? $student->classroom : null;
            $sinifTamAdi = $classroom ? ($classroom->name . ($classroom->educationLevel ? ' - ' . $classroom->educationLevel->name : '')) : '-';
            $veli = $student && $student->guardians->isNotEmpty() ? $student->guardians->first() : null;
            $gelmeyenOgrenciler[] = [
                'schedule_id' => $a->schedule_id,
                'student_id' => $student ? $student->id : $a->student_id,
                'ogrenci_adi' => $student ? $student->name : '-',
                'okul_no' => $student ? $student->school_no : '',
                'sinif_tam_adi' => $sinifTamAdi,
                'ders_adi' => $a->schedule && $a->schedule->lesson ? $a->schedule->lesson->name : 'Ders',
                'ders_saati' => $slotBySchedule[$a->schedule_id] ?? 0,
                'durum' => $a->status === 'late' ? 'gec' : ($a->status === 'excused' ? 'izinli' : ($a->status === 'sick' ? 'raporlu' : 'gelmedi')),
                'veli_adi' => $veli ? $veli->name : null,
                'veli_telefon' => $veli ? $veli->phone : null,
            ];
        }
        return $gelmeyenOgrenciler;
    }
}
