<?php

namespace App\Http\Controllers;

use App\Actions\CreateTutoringSessionAction;
use App\Actions\UpdateTutoringSessionAction;
use App\Actions\CreateTutoringSessionAttendanceAction;
use App\Http\Requests\StoreTutoringSessionRequest;
use App\Http\Requests\UpdateTutoringSessionRequest;
use App\Http\Requests\StoreTutoringSessionAttendanceRequest;
use App\Http\Resources\TutoringSessionResource;
use App\Models\TutoringSession;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

class TutoringSessionController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of tutoring sessions.
     */
    public function index(): JsonResponse
    {
        try {
            Gate::authorize('viewAny', TutoringSession::class);

            if (!Schema::hasTable('tutoring_sessions')) {
                return $this->success([
                    'sessions' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => (int) request('per_page', 50),
                        'total' => 0,
                    ],
                ], 'Etütler başarıyla listelendi.');
            }

            $query = TutoringSession::with(['teacher', 'lesson', 'homework', 'students', 'attendances', 'creator']);

            // Filtreleme
            if (request()->has('teacher_id')) {
                $query->where('teacher_id', request('teacher_id'));
            }

            if (request()->has('type')) {
                $query->where('type', request('type'));
            }

            if (request()->has('date')) {
                $query->where('date', request('date'));
            }

            if (request()->has('date_from')) {
                $query->where('date', '>=', request('date_from'));
            }

            if (request()->has('date_to')) {
                $query->where('date', '<=', request('date_to'));
            }

            if (request()->has('is_active')) {
                $query->where('is_active', request('is_active'));
            }

            // Öğretmen sadece kendi etütlerini görsün (yönetici değilse)
            $user = auth()->user();
            $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
            $isManager = $user->is_superadmin
                || in_array((int) $user->role_id, [1, 2, 3, 4], true)
                || in_array($roleName, ['owner', 'kurucu', 'admin', 'genel müdür', 'kampüs müdürü', 'müdür', 'müdür yardımcısı', 'öğrenci işleri'], true);

            if (!$isManager) {
                $query->where('teacher_id', $user->id);
            }

            // Sıralama
            $query->orderBy('date', 'desc')
                ->orderBy('start_time', 'asc');

            $sessions = $query->paginate(request('per_page', 50));

            return $this->success([
                'sessions' => TutoringSessionResource::collection($sessions),
                'pagination' => [
                    'current_page' => $sessions->currentPage(),
                    'last_page' => $sessions->lastPage(),
                    'per_page' => $sessions->perPage(),
                    'total' => $sessions->total(),
                ],
            ], 'Etütler başarıyla listelendi.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->error('Bu işlem için yetkiniz bulunmuyor.', [], 403);
        } catch (\Throwable $e) {
            return $this->success([
                'sessions' => [],
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => (int) request('per_page', 50),
                    'total' => 0,
                ],
            ], 'Etütler listelendi.');
        }
    }

    /**
     * Store a newly created tutoring session.
     */
    public function store(StoreTutoringSessionRequest $request, CreateTutoringSessionAction $action): JsonResponse
    {
        Gate::authorize('create', TutoringSession::class);

        try {
            $session = $action->execute($request->validated());

            return $this->success(new TutoringSessionResource($session), 'Etüt başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified tutoring session.
     */
    public function show(TutoringSession $tutoringSession): JsonResponse
    {
        try {
            Gate::authorize('view', $tutoringSession);

            $tutoringSession->load([
                'teacher',
                'lesson',
                'homework',
                'students.classroom',
                'students.guardians',
                'attendances.student',
                'creator'
            ]);

            return $this->success(new TutoringSessionResource($tutoringSession));
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->error('Bu işlem için yetkiniz bulunmuyor.', [], 403);
        }
    }

    /**
     * Update the specified tutoring session.
     */
    public function update(UpdateTutoringSessionRequest $request, TutoringSession $tutoringSession, UpdateTutoringSessionAction $action): JsonResponse
    {
        Gate::authorize('update', $tutoringSession);

        try {
            $updatedSession = $action->execute($tutoringSession, $request->validated());

            return $this->success(new TutoringSessionResource($updatedSession), 'Etüt başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified tutoring session.
     */
    public function destroy(TutoringSession $tutoringSession): JsonResponse
    {
        Gate::authorize('delete', $tutoringSession);

        $this->activityLogService->logDelete($tutoringSession);
        $tutoringSession->delete();

        return $this->success(null, 'Etüt başarıyla silindi.');
    }

    /**
     * Add student to tutoring session.
     */
    public function addStudent(TutoringSession $tutoringSession): JsonResponse
    {
        Gate::authorize('update', $tutoringSession);

        request()->validate([
            'student_id' => ['required', 'exists:students,id'],
        ]);

        $studentId = request('student_id');

        // Maksimum öğrenci kontrolü
        if ($tutoringSession->isFull()) {
            return $this->error('Etüt kapasitesi dolmuş.', [], 400);
        }

        // Öğrenci zaten ekli mi kontrol et
        if ($tutoringSession->students()->where('students.id', $studentId)->exists()) {
            return $this->error('Öğrenci zaten bu etüte kayıtlı.', [], 400);
        }

        $tutoringSession->students()->attach($studentId);

        return $this->success(null, 'Öğrenci başarıyla eklendi.');
    }

    /**
     * Remove student from tutoring session.
     */
    public function removeStudent(TutoringSession $tutoringSession): JsonResponse
    {
        Gate::authorize('update', $tutoringSession);

        request()->validate([
            'student_id' => ['required', 'exists:students,id'],
        ]);

        $studentId = request('student_id');

        $tutoringSession->students()->detach($studentId);

        return $this->success(null, 'Öğrenci başarıyla çıkarıldı.');
    }

    /**
     * Take attendance for tutoring session.
     */
    public function takeAttendance(TutoringSession $tutoringSession, CreateTutoringSessionAttendanceAction $action): JsonResponse
    {
        Gate::authorize('update', $tutoringSession);

        $request = new StoreTutoringSessionAttendanceRequest();
        $validated = request()->validate($request->rules());

        try {
            $attendance = $action->execute($tutoringSession, $validated);

            return $this->success(['attendance' => $attendance], 'Yoklama başarıyla alındı.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Bulk attendance for tutoring session.
     */
    public function bulkAttendance(TutoringSession $tutoringSession, CreateTutoringSessionAttendanceAction $action): JsonResponse
    {
        Gate::authorize('update', $tutoringSession);

        request()->validate([
            'attendances' => ['required', 'array'],
            'attendances.*.student_id' => ['required', 'exists:students,id'],
            'attendances.*.status' => ['required', 'in:present,absent,late'],
            'attendances.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $attendances = [];
        $errors = [];

        foreach (request('attendances') as $attendanceData) {
            try {
                $attendance = $action->execute($tutoringSession, $attendanceData);
                $attendances[] = $attendance;
            } catch (\Exception $e) {
                $errors[] = $e->getMessage();
            }
        }

        if (!empty($errors)) {
            return $this->error('Bazı yoklamalar alınamadı.', ['errors' => $errors, 'attendances' => $attendances], 400);
        }

        return $this->success(['attendances' => $attendances], 'Tüm yoklamalar başarıyla alındı.');
    }

    /**
     * Get tutoring session statistics.
     */
    public function getStatistics(): JsonResponse
    {
        try {
            Gate::authorize('viewAny', TutoringSession::class);

            if (!Schema::hasTable('tutoring_sessions')) {
                return $this->success([
                    'period' => [
                        'start_date' => request('start_date', now()->startOfMonth()->format('Y-m-d')),
                        'end_date' => request('end_date', now()->endOfMonth()->format('Y-m-d')),
                    ],
                    'summary' => [
                        'total_sessions' => 0,
                        'total_students' => 0,
                        'total_attendances' => 0,
                        'total_absences' => 0,
                        'attendance_rate' => 0,
                    ],
                    'by_type' => [],
                    'by_teacher' => [],
                    'by_week' => [],
                ], 'Etüt istatistikleri başarıyla getirildi.');
            }

            $startDate = request('start_date', now()->startOfMonth()->format('Y-m-d'));
            $endDate = request('end_date', now()->endOfMonth()->format('Y-m-d'));
            $teacherId = request('teacher_id');
            $type = request('type');

            $user = auth()->user();
            $roleName = $user->role ? mb_strtolower(trim((string) $user->role->name), 'UTF-8') : '';
            $isManager = $user->is_superadmin
                || in_array((int) $user->role_id, [1, 2, 3, 4], true)
                || in_array($roleName, ['owner', 'kurucu', 'admin', 'genel müdür', 'kampüs müdürü', 'müdür', 'müdür yardımcısı', 'öğrenci işleri'], true);

            if (!$isManager) {
                $teacherId = $user->id;
            }

            $query = TutoringSession::whereBetween('date', [$startDate, $endDate]);

            if ($teacherId) {
                $query->where('teacher_id', $teacherId);
            }

            if ($type) {
                $query->where('type', $type);
            }

            $sessions = $query->with(['teacher', 'students', 'attendances'])->get();

            // Genel istatistikler
            $totalSessions = $sessions->count();
            $totalStudents = $sessions->sum(function ($session) {
                return $session->students->count();
            });
            $totalAttendances = $sessions->sum(function ($session) {
                return $session->attendances->where('status', 'present')->count();
            });
            $totalAbsences = $sessions->sum(function ($session) {
                return $session->attendances->where('status', 'absent')->count();
            });

            $startOfWeek = now()->startOfWeek()->format('Y-m-d');
            $endOfWeek = now()->endOfWeek()->format('Y-m-d');
            $thisWeekCount = $sessions->filter(function ($s) use ($startOfWeek, $endOfWeek) {
                $d = $s->date ? $s->date->format('Y-m-d') : null;
                return $d && $d >= $startOfWeek && $d <= $endOfWeek;
            })->count();

            $activeRoomsCount = $sessions->pluck('room')->filter()->unique()->count();
            $attendanceRate = ($totalAttendances + $totalAbsences > 0)
                ? round(($totalAttendances / ($totalAttendances + $totalAbsences)) * 100, 2)
                : 0;

            // Tür bazlı istatistikler
            $byType = $sessions->groupBy('type')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'total_students' => $group->sum(fn($s) => $s->students->count()),
                    'total_attendances' => $group->sum(fn($s) => $s->attendances->where('status', 'present')->count()),
                ];
            });

            // Öğretmen bazlı istatistikler
            $byTeacher = $sessions->groupBy('teacher_id')->map(function ($group) {
                $teacher = $group->first()->teacher;
                return [
                    'teacher_id' => $teacher?->id ?? $group->first()->teacher_id,
                    'teacher_name' => $teacher?->name ?? 'Bilinmiyor',
                    'count' => $group->count(),
                    'total_students' => $group->sum(fn($s) => $s->students->count()),
                ];
            })->values();

            // Haftalık istatistikler
            $byWeek = $sessions->groupBy(function ($session) {
                return $session->date ? $session->date->format('Y-W') : 'unknown';
            })->map(function ($group) {
                return [
                    'week' => $group->first()->date ? $group->first()->date->format('Y-W') : 'unknown',
                    'count' => $group->count(),
                    'total_students' => $group->sum(fn($s) => $s->students->count()),
                ];
            })->values();

            return $this->success([
                'total_sessions' => $totalSessions,
                'attendance_rate' => $attendanceRate,
                'this_week' => $thisWeekCount,
                'active_rooms' => $activeRoomsCount,
                'period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                'summary' => [
                    'total_sessions' => $totalSessions,
                    'total_students' => $totalStudents,
                    'total_attendances' => $totalAttendances,
                    'total_absences' => $totalAbsences,
                    'attendance_rate' => $attendanceRate,
                    'this_week' => $thisWeekCount,
                    'active_rooms' => $activeRoomsCount,
                ],
                'by_type' => $byType,
                'by_teacher' => $byTeacher,
                'by_week' => $byWeek,
            ], 'Etüt istatistikleri başarıyla getirildi.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return $this->error('Bu işlem için yetkiniz bulunmuyor.', [], 403);
        } catch (\Throwable $e) {
            return $this->success([
                'period' => [
                    'start_date' => request('start_date', now()->startOfMonth()->format('Y-m-d')),
                    'end_date' => request('end_date', now()->endOfMonth()->format('Y-m-d')),
                ],
                'summary' => [
                    'total_sessions' => 0,
                    'total_students' => 0,
                    'total_attendances' => 0,
                    'total_absences' => 0,
                    'attendance_rate' => 0,
                ],
                'by_type' => [],
                'by_teacher' => [],
                'by_week' => [],
            ], 'Etüt istatistikleri getirildi.');
        }
    }
}
