<?php

namespace App\Http\Controllers;

use App\Models\TeacherMeeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MeetingsController extends ApiController
{
    private function resolveRoleName($user): ?string
    {
        if (! $user) {
            return null;
        }

        return $user->role?->name
            ?? ($user->role_name ?? null)
            ?? ($user->role ?? null)
            ?? null;
    }

    private function isAdminRole(?string $roleName): bool
    {
        return in_array((string) $roleName, [
            'owner',
            'Admin',
            'Genel Müdür',
            'Müdür',
            'Müdür Yardımcısı',
            'Kampüs Müdürü',
            'Öğrenci İşleri',
            'student_affairs',
        ], true);
    }

    private function isTeacherRole(?string $roleName): bool
    {
        return in_array((string) $roleName, [
            'Öğretmen',
            'Sınıf Öğretmeni',
            'Rehberlik',
            'Rehber Öğretmen',
            'guidance',
            'rehber_teacher',
            'guidance_teacher',
            'teacher',
        ], true);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        $roleName = $this->resolveRoleName($user);
        $isTeacher = $this->isTeacherRole($roleName);

        if (! $this->isUnrestrictedUser($user) && ! $this->isAdminRole($roleName) && ! $isTeacher) {
            return $this->error('Bu sayfaya erişim yetkiniz yok.', [], 403);
        }

        $query = TeacherMeeting::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('visibility', '!=', TeacherMeeting::VISIBILITY_PRIVATE)
            ->with([
                'teacher:id,name',
                'student.classroom.educationLevel',
            ]);

        // Öğretmen yalnızca kendi görüşmelerini görebilir
        if ($isTeacher) {
            $query->where('teacher_id', $user->id);
        }

        if ($request->filled('type')) {
            $query->where('type', (string) $request->query('type'));
        }

        if ($request->filled('meeting_with')) {
            $query->where('meeting_with', (string) $request->query('meeting_with'));
        }

        if (! $isTeacher && $request->filled('teacher_id')) {
            $query->where('teacher_id', (int) $request->query('teacher_id'));
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', (int) $request->query('student_id'));
        }

        $records = $query
            ->orderByDesc('meeting_date')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        $data = $records->map(function (TeacherMeeting $m) {
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
                'meeting_date' => $m->meeting_date ? Carbon::parse($m->meeting_date)->format('Y-m-d') : null,
                'meeting_time' => $m->meeting_time,
                'visibility' => $m->visibility,
                'status' => $m->status,
                'teacher' => $m->teacher ? [
                    'id' => $m->teacher->id,
                    'name' => $m->teacher->name,
                ] : null,
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
        });

        return $this->success([
            'meetings' => $data,
        ], 'Görüşmeler listelendi.');
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Kullanıcı giriş yapmamış.', [], 401);
        }

        $roleName = $this->resolveRoleName($user);
        $isTeacher = $this->isTeacherRole($roleName);

        if (! $this->isUnrestrictedUser($user) && ! $this->isAdminRole($roleName) && ! $isTeacher) {
            return $this->error('Bu sayfaya erişim yetkiniz yok.', [], 403);
        }

        $applyFilters = function ($q) use ($request) {
            if ($request->filled('type')) {
                $q->where('tm.type', (string) $request->query('type'));
            }
            if ($request->filled('meeting_with')) {
                $q->where('tm.meeting_with', (string) $request->query('meeting_with'));
            }
            if ($request->filled('teacher_id')) {
                $q->where('tm.teacher_id', (int) $request->query('teacher_id'));
            }
            if ($request->filled('student_id')) {
                $q->where('tm.student_id', (int) $request->query('student_id'));
            }
            if ($request->has('season_id') && $request->query('season_id') !== '') {
                $q->where('tm.season_id', (int) $request->query('season_id'));
            } elseif (!$request->has('season_id')) {
                // Only fallback to active if parameter is missing entirely
                // If it is present but empty, it means 'All Seasons'
                $tenantId = (int) $request->user()->tenant_id;
                $activeSeasonId = $this->getCurrentSeasonId();
                if ($activeSeasonId) {
                    $q->where('tm.season_id', $activeSeasonId);
                }
            }
        };

        $base = DB::table('teacher_meetings as tm')
            ->where('tm.tenant_id', (int) $user->tenant_id)
            ->where('tm.visibility', '!=', TeacherMeeting::VISIBILITY_PRIVATE);

        // Öğretmen yalnızca kendi istatistiklerini görebilir
        if ($isTeacher) {
            $base->where('tm.teacher_id', (int) $user->id);
        }

        $applyFilters($base);

        $totalsRow = (clone $base)
            ->selectRaw("COUNT(*) as total_records")
            ->selectRaw("SUM(CASE WHEN tm.meeting_with = ? THEN 1 ELSE 0 END) as student_meetings", [TeacherMeeting::MEETING_WITH_STUDENT])
            ->selectRaw("SUM(CASE WHEN tm.meeting_with = ? THEN 1 ELSE 0 END) as parent_meetings", [TeacherMeeting::MEETING_WITH_PARENT])
            ->selectRaw("SUM(CASE WHEN tm.type = ? THEN 1 ELSE 0 END) as meetings", [TeacherMeeting::TYPE_MEETING])
            ->selectRaw("SUM(CASE WHEN tm.type = ? THEN 1 ELSE 0 END) as appointments", [TeacherMeeting::TYPE_APPOINTMENT])
            ->first();

        $byTeacher = (clone $base)
            ->join('users as u', 'u.id', '=', 'tm.teacher_id')
            ->groupBy('tm.teacher_id', 'u.name')
            ->orderBy('u.name')
            ->select([
                'tm.teacher_id as teacher_id',
                'u.name as teacher_name',
            ])
            ->selectRaw("COUNT(*) as total_records")
            ->selectRaw("SUM(CASE WHEN tm.meeting_with = ? THEN 1 ELSE 0 END) as student_meetings", [TeacherMeeting::MEETING_WITH_STUDENT])
            ->selectRaw("SUM(CASE WHEN tm.meeting_with = ? THEN 1 ELSE 0 END) as parent_meetings", [TeacherMeeting::MEETING_WITH_PARENT])
            ->get();

        $lastMonthFrom = Carbon::today()->subDays(30)->toDateString();
        $topLastMonth = DB::table('teacher_meetings as tm')
            ->join('users as u', 'u.id', '=', 'tm.teacher_id')
            ->where('tm.tenant_id', (int) $user->tenant_id)
            ->where('tm.visibility', '!=', TeacherMeeting::VISIBILITY_PRIVATE)
            ->whereDate('tm.meeting_date', '>=', $lastMonthFrom);
        
        $applyFilters($topLastMonth);

        $topLastMonth = $topLastMonth
            ->groupBy('tm.teacher_id', 'u.name')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->limit(10)
            ->select([
                'tm.teacher_id as teacher_id',
                'u.name as teacher_name',
            ])
            ->selectRaw('COUNT(*) as total_records')
            ->get();

        return $this->success([
            'totals' => [
                'total_records' => (int) ($totalsRow->total_records ?? 0),
                'student_meetings' => (int) ($totalsRow->student_meetings ?? 0),
                'parent_meetings' => (int) ($totalsRow->parent_meetings ?? 0),
                'meetings' => (int) ($totalsRow->meetings ?? 0),
                'appointments' => (int) ($totalsRow->appointments ?? 0),
            ],
            'by_teacher' => $byTeacher,
            'top_last_30_days' => $topLastMonth,
            'last_30_days_from' => $lastMonthFrom,
        ], 'Görüşme istatistikleri getirildi.');
    }
}
