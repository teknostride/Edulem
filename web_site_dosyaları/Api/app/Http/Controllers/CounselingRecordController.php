<?php

namespace App\Http\Controllers;

use App\Models\CounselingRecord;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;

class CounselingRecordController extends ApiController
{
    private function resolveRoleName(Request $request): ?string
    {
        $user = $request->user();
        if (!$user) return null;

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

    private function guardAgainstStudentAffairs(Request $request): ?JsonResponse
    {
        $roleName = $this->resolveRoleName($request);

        if (in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true)) {
            return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
        }

        return null;
    }

    public function index(Request $request): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);

        $query = CounselingRecord::query()
            ->with([
                'student:id,name,school_no,classroom_id,education_level_id,tenant_id',
                'student.classroom:id,name,campus_id,education_level_id,grade_level',
                'counselor:id,first_name,last_name,name',
            ])
            ->orderByDesc('meeting_at')
            ->orderByDesc('id');

        if ($this->isAdminRole($roleName)) {
            // İdareciler sadece paylaşılmış kayıtları görebilir.
            // Ancak kendi oluşturdukları özel kayıtları da görebilsin (başkasının özeli yine görünmez).
            $query->where(function ($q) use ($user) {
                $q->where('is_private', false);
                if ($user?->id) {
                    $q->orWhere('counselor_id', $user->id);
                }
            });
        } else {
            // Rehber öğretmen kendi kayıtlarını (özel + açık) + kurumdaki diğer rehberlerin açık kayıtlarını görür
            $query->where(function ($q) use ($user) {
                $q->where('counselor_id', $user?->id)
                  ->orWhere('is_private', false);
            });
        }

        if ($request->filled('classroom_id')) {
            $classroomId = (int) $request->input('classroom_id');
            $query->whereHas('student', fn($q) => $q->where('classroom_id', $classroomId));
        }

        $search = trim((string) ($request->input('student_search') ?? $request->input('search') ?? ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('student', function ($sq) use ($search) {
                    $sq->where('name', 'like', "%{$search}%")
                        ->orWhere('school_no', 'like', "%{$search}%");
                })->orWhere('subject', 'like', "%{$search}%");
            });
        }

        $dateFrom = $request->input('date_from') ?? $request->input('start_date');
        if ($dateFrom) {
            $query->whereDate('meeting_at', '>=', $dateFrom);
        }

        $dateTo = $request->input('date_to') ?? $request->input('end_date');
        if ($dateTo) {
            $query->whereDate('meeting_at', '<=', $dateTo);
        }

        $perPage = max(1, min((int) $request->input('per_page', 20), 100));
        $records = $query->paginate($perPage);

        $records->getCollection()->transform(function (CounselingRecord $record) {
            return $record->makeHidden(['content']);
        });

        return $this->success([
            'records' => $records->items(),
            'pagination' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show(Request $request, CounselingRecord $record): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);

        if (!$this->canViewRecord($roleName, $user?->id, $record)) {
            return $this->error('Bu kaydı görüntüleme yetkiniz yok.', [], 403);
        }

        $record->load([
            'student:id,name,school_no,classroom_id,education_level_id,tenant_id',
            'student.classroom:id,name,campus_id,education_level_id,grade_level',
            'counselor:id,first_name,last_name,name',
        ]);

        if ($this->isAdminRole($roleName) && $record->is_private === true && (int) $record->counselor_id !== (int) ($user?->id ?? 0)) {
            $record->makeHidden(['content']);
        }

        return $this->success([
            'record' => $record,
        ]);
    }

    public function pdf(Request $request, CounselingRecord $record)
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);

        if (!$this->canViewRecord($roleName, $user?->id, $record)) {
            return $this->error('Bu kaydı görüntüleme yetkiniz yok.', [], 403);
        }

        if ($this->isAdminRole($roleName) && $record->is_private === true && (int) $record->counselor_id !== (int) ($user?->id ?? 0)) {
            return $this->error('Bu kaydın içeriğine erişim yetkiniz yok.', [], 403);
        }

        $record->load([
            'student:id,name,school_no,classroom_id,tenant_id',
            'student.classroom:id,name',
            'counselor:id,first_name,last_name,name',
        ]);

        $studentName = e($record->student?->name ?? '-');
        $classroomName = e($record->student?->classroom?->name ?? '-');
        $subject = e($record->subject);
        $meetingDate = e(optional($record->meeting_at)->format('d.m.Y'));
        $meetingTime = e(optional($record->meeting_at)->format('H:i'));
        $counselorName = e(trim((string) ($record->counselor?->name ?? trim((string) ($record->counselor?->first_name . ' ' . $record->counselor?->last_name)))));

        $html = "<!doctype html>
<html lang=\"tr\">
<head>
  <meta charset=\"utf-8\" />
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
    .title { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 12px; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .meta td { padding: 6px 8px; border: 1px solid #ddd; }
    .content { border: 1px solid #ddd; padding: 10px; min-height: 260px; }
    .footer { margin-top: 18px; text-align: center; }
    .sign { display: inline-block; width: 60%; border-top: 1px solid #333; padding-top: 6px; }
  </style>
</head>
<body>
  <div class=\"title\">Rehberlik Görüşme Tutanağı</div>
  <table class=\"meta\">
    <tr><td><b>Öğrenci</b></td><td>{$studentName}</td><td><b>Sınıf</b></td><td>{$classroomName}</td></tr>
    <tr><td><b>Tarih</b></td><td>{$meetingDate}</td><td><b>Saat</b></td><td>{$meetingTime}</td></tr>
    <tr><td><b>Konu</b></td><td colspan=\"3\">{$subject}</td></tr>
    <tr><td><b>Görüşen</b></td><td colspan=\"3\">{$counselorName}</td></tr>
  </table>
  <div class=\"content\">{$record->content}</div>
  <div class=\"footer\">
    <div class=\"sign\">İmza</div>
  </div>
</body>
</html>";

        $pdf = Pdf::loadHTML($html)->setPaper('a4');
        $fileName = 'gorusme-tutanagi-' . $record->id . '.pdf';

        return $pdf->download($fileName);
    }

    public function store(Request $request): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);
        if (!$this->isGuidanceRole($roleName) && !$this->isAdminRole($roleName)) {
            return $this->error('Bu işlem için yetkiniz yok.', [], 403);
        }

        $validated = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'subject' => 'required|string|max:255',
            'meeting_at' => 'required|date',
            'content' => 'required|string',
            'is_private' => 'sometimes|boolean',
        ]);

        $student = Student::query()->findOrFail((int) $validated['student_id']);
        if ($user && $student->tenant_id !== $user->tenant_id) {
            return $this->error('Bu öğrenci için işlem yetkiniz yok.', [], 403);
        }

        $record = CounselingRecord::create([
            'tenant_id' => $user?->tenant_id,
            'student_id' => (int) $validated['student_id'],
            'counselor_id' => (int) $user?->id,
            'subject' => trim((string) $validated['subject']),
            'meeting_at' => $validated['meeting_at'],
            'content' => trim((string) $validated['content']),
            'is_private' => (bool) ($validated['is_private'] ?? true),
        ]);

        return $this->success([
            'record' => $record->load([
                'student:id,name,school_no,classroom_id,education_level_id,tenant_id',
                'student.classroom:id,name,campus_id,education_level_id,grade_level',
                'counselor:id,first_name,last_name,name',
            ]),
        ], 'Görüşme tutanağı kaydedildi.', 201);
    }

    public function update(Request $request, CounselingRecord $record): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);
        if (!$this->isGuidanceRole($roleName) && !$this->isAdminRole($roleName)) {
            return $this->error('Bu işlem için yetkiniz yok.', [], 403);
        }
        if (!$this->canModifyRecord($user?->id, $record, $roleName)) {
            return $this->error('Bu kaydı düzenleme yetkiniz yok.', [], 403);
        }

        $validated = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'subject' => 'required|string|max:255',
            'meeting_at' => 'required|date',
            'content' => 'required|string',
            'is_private' => 'sometimes|boolean',
        ]);

        $student = Student::query()->findOrFail((int) $validated['student_id']);
        if ($user && $student->tenant_id !== $user->tenant_id) {
            return $this->error('Bu öğrenci için işlem yetkiniz yok.', [], 403);
        }

        $record->update([
            'student_id' => (int) $validated['student_id'],
            'subject' => trim((string) $validated['subject']),
            'meeting_at' => $validated['meeting_at'],
            'content' => trim((string) $validated['content']),
            'is_private' => (bool) ($validated['is_private'] ?? $record->is_private),
        ]);

        return $this->success([
            'record' => $record->fresh()->load([
                'student:id,name,school_no,classroom_id,education_level_id,tenant_id',
                'student.classroom:id,name,campus_id,education_level_id,grade_level',
                'counselor:id,first_name,last_name,name',
            ]),
        ], 'Görüşme tutanağı güncellendi.');
    }

    public function destroy(Request $request, CounselingRecord $record): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);
        if (!$this->isGuidanceRole($roleName) && !$this->isAdminRole($roleName)) {
            return $this->error('Bu işlem için yetkiniz yok.', [], 403);
        }
        if (!$this->canModifyRecord($user?->id, $record, $roleName)) {
            return $this->error('Bu kaydı silme yetkiniz yok.', [], 403);
        }

        $record->delete();

        return $this->success([], 'Görüşme tutanağı silindi.');
    }

    public function stats(Request $request): JsonResponse
    {
        if ($guard = $this->guardAgainstStudentAffairs($request)) {
            return $guard;
        }

        $user = $request->user();
        $roleName = $this->resolveRoleName($request);
        if (!$this->isAdminRole($roleName)) {
            return $this->error('Bu işlem için yetkiniz yok.', [], 403);
        }

        $tenantId = $user?->tenant_id;
        if (!$tenantId) {
            return $this->error('Tenant bilgisi bulunamadı.', [], 422);
        }

        $base = CounselingRecord::query()->where('tenant_id', $tenantId);

        $totalsByCounselor = (clone $base)
            ->select([
                'counselor_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) as private_count'),
                DB::raw('SUM(CASE WHEN is_private = 0 THEN 1 ELSE 0 END) as shared_count'),
            ])
            ->groupBy('counselor_id')
            ->get();

        $last7ByCounselor = (clone $base)
            ->where('meeting_at', '>=', now()->subDays(7))
            ->select([
                'counselor_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) as private_count'),
                DB::raw('SUM(CASE WHEN is_private = 0 THEN 1 ELSE 0 END) as shared_count'),
            ])
            ->groupBy('counselor_id')
            ->get();

        $last30ByCounselor = (clone $base)
            ->where('meeting_at', '>=', now()->subDays(30))
            ->select([
                'counselor_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) as private_count'),
                DB::raw('SUM(CASE WHEN is_private = 0 THEN 1 ELSE 0 END) as shared_count'),
            ])
            ->groupBy('counselor_id')
            ->get();

        $classroomLast30 = DB::table('counseling_records')
            ->join('students', 'students.id', '=', 'counseling_records.student_id')
            ->leftJoin('classrooms', 'classrooms.id', '=', 'students.classroom_id')
            ->where('counseling_records.tenant_id', $tenantId)
            ->where('counseling_records.meeting_at', '>=', now()->subDays(30))
            ->groupBy('students.classroom_id', 'classrooms.name')
            ->select([
                'students.classroom_id as classroom_id',
                DB::raw('COALESCE(classrooms.name, "-") as classroom_name'),
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN counseling_records.is_private = 1 THEN 1 ELSE 0 END) as private_count'),
                DB::raw('SUM(CASE WHEN counseling_records.is_private = 0 THEN 1 ELSE 0 END) as shared_count'),
            ])
            ->orderByDesc('total')
            ->get();

        $counselorIds = collect([$totalsByCounselor, $last7ByCounselor, $last30ByCounselor])
            ->flatten(1)
            ->pluck('counselor_id')
            ->filter()
            ->unique()
            ->values();

        $counselors = DB::table('users')
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $counselorIds)
            ->select(['id', 'first_name', 'last_name', 'name'])
            ->get()
            ->keyBy('id');

        $mapCounselor = function ($rows) use ($counselors) {
            return collect($rows)->map(function ($r) use ($counselors) {
                $c = $counselors[$r->counselor_id] ?? null;
                $full = trim((string) (($c->first_name ?? '') . ' ' . ($c->last_name ?? '')));
                $label = $full !== '' ? $full : ($c->name ?? '-');

                return [
                    'counselor_id' => (int) $r->counselor_id,
                    'counselor_name' => $label,
                    'total' => (int) $r->total,
                    'private_count' => (int) $r->private_count,
                    'shared_count' => (int) $r->shared_count,
                ];
            })->values();
        };

        return $this->success([
            'totals_by_counselor' => $mapCounselor($totalsByCounselor),
            'last_7_days_by_counselor' => $mapCounselor($last7ByCounselor),
            'last_30_days_by_counselor' => $mapCounselor($last30ByCounselor),
            'last_30_days_by_classroom' => $classroomLast30,
        ]);
    }

    private function isAdminRole(?string $roleName): bool
    {
        if (!$roleName) return false;
        $r = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($r, [
            'owner',
            'admin',
            'genel müdür',
            'genel mudur',
            'müdür',
            'mudur',
            'müdür yardımcısı',
            'mudur yardimcisi',
            'kampüs müdürü',
            'kampus muduru',
            'kurucu',
            'superadmin',
            'super admin',
            'yönetici',
            'yonetici',
        ], true);
    }

    private function isGuidanceRole(?string $roleName): bool
    {
        if (!$roleName) return false;
        $r = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($r, [
            'rehberlik',
            'guidance',
            'rehber öğretmen',
            'rehber ogretmen',
            'rehber_teacher',
            'guidance_teacher',
            'rehberlik öğretmeni',
            'rehberlik ogretmeni',
            '6',
        ], true) || str_contains($r, 'rehber');
    }

    private function canViewRecord(?string $roleName, ?int $userId, CounselingRecord $record): bool
    {
        if ($this->isAdminRole($roleName)) {
            return true;
        }

        return $userId !== null && (int) $record->counselor_id === (int) $userId;
    }

    private function canModifyRecord(?int $userId, CounselingRecord $record, ?string $roleName = null): bool
    {
        if ($this->isAdminRole($roleName)) {
            return true;
        }

        return $userId !== null && (int) $record->counselor_id === (int) $userId;
    }
}
