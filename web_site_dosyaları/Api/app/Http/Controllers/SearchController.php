<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\EducationLevel;
use App\Models\Lesson;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends ApiController
{
    private const TEACHER_ROLES = [
        'Öğretmen', 'Sınıf Öğretmeni', 'teacher',
        'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'
    ];

    private const ADMIN_ROLES = [
        'owner', 'kurucu', 'founder', 'Admin', 'admin', 'Genel Müdür', 'superadmin'
    ];

    private const MANAGER_ROLES = [
        'Müdür', 'Müdür Yardımcısı', 'mudur', 'mudur_yardimcisi',
        'Kampüs Müdürü', 'Öğrenci İşleri', 'student_affairs'
    ];

    private function isTeacherRole(?string $roleName): bool
    {
        return $roleName && in_array($roleName, self::TEACHER_ROLES, true);
    }

    private function isGuidanceRole($user): bool
    {
        if (! $user) return false;
        $roleId = (int) ($user->role_id ?? 0);
        if ($roleId === 6) return true;
        $roleName = $user->role ? $user->role->name : null;
        return $roleName && in_array($roleName, ['Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true);
    }

    private function teacherAllowedClassroomIds($user): array
    {
        if (! $user) return [];

        // Rehberlik servisi: Atandığı kademe ve kampüsteki tüm sınıflar
        if ($this->isGuidanceRole($user)) {
            $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
            $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

            if (empty($campusIds) && empty($educationLevelIds)) {
                return Classroom::query()
                    ->where('tenant_id', $user->tenant_id)
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->toArray();
            }

            $query = Classroom::query()->where('tenant_id', $user->tenant_id);
            if (!empty($educationLevelIds)) {
                $query->whereIn('grade_level', $educationLevelIds);
            }
            if (!empty($campusIds)) {
                $query->whereHas('educationLevel', function ($q) use ($campusIds) {
                    $q->whereIn('campus_id', $campusIds);
                });
            }

            return $query->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values()
                ->all();
        }

        $teacherId = (int) $user->id;

        // 1) Ders programında öğretmenin veya yardımcı öğretmenin olduğu sınıflar
        $scheduleClassroomIds = Schedule::query()
            ->where('tenant_id', $user->tenant_id)
            ->where(function ($q) use ($teacherId) {
                $q->where('teacher_id', $teacherId)
                  ->orWhereJsonContains('assistant_teacher_ids', $teacherId)
                  ->orWhereJsonContains('assistant_teacher_ids', (string) $teacherId)
                  ->orWhereRaw("FIND_IN_SET(?, REPLACE(REPLACE(REPLACE(COALESCE(assistant_teacher_ids, ''), '[', ''), ']', ''), '\"', ''))", [$teacherId]);
            })
            ->whereNotNull('classroom_id')
            ->pluck('classroom_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->toArray();

        // 2) Sınıf rehber öğretmenliği yaptığı sınıflar
        $mainClassroomIds = Classroom::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('teacher_id', $teacherId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->toArray();

        return array_values(array_unique(array_merge($scheduleClassroomIds, $mainClassroomIds)));
    }

    /**
     * Global arama: öğrenci, ders, kullanıcı
     */
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (strlen($q) < 2) {
            return $this->success([
                'students' => [],
                'lessons' => [],
                'users' => [],
            ], 'Arama en az 2 karakter olmalıdır.');
        }

        $term = '%' . $q . '%';
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        // Öğretmen araması
        if ($this->isTeacherRole($roleName)) {
            $students = $this->searchTeacherStudents($user, $term);
            return $this->success([
                'students' => $students,
                'lessons' => [],
                'users' => [],
            ], 'Arama tamamlandı.');
        }

        // Yönetici / Müdür / Standart kullanıcı araması
        $tenantId = $user?->tenant_id;
        $isSuperAdmin = (bool) ($user && $user->is_superadmin);
        $isAdminRole = in_array($roleName, self::ADMIN_ROLES, true);
        $isUnrestricted = $isSuperAdmin || $isAdminRole || $this->isUnrestrictedUser($user);

        $userLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
        $userCampusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));

        $campusLevelIds = [];
        if (!empty($userCampusIds)) {
            $campusLevelIds = EducationLevel::whereIn('campus_id', $userCampusIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->toArray();
        }

        $effectiveLevelIds = array_values(array_unique(array_merge($userLevelIds, $campusLevelIds)));

        $students = $this->searchStudents($user, $tenantId, $isSuperAdmin, $isUnrestricted, $userLevelIds, $userCampusIds, $effectiveLevelIds, $term);
        $lessons = $this->searchLessons($tenantId, $isSuperAdmin, $isUnrestricted, $effectiveLevelIds, $term);
        $users = $this->searchUsers($tenantId, $isSuperAdmin, $isUnrestricted, $userLevelIds, $userCampusIds, $term);

        return $this->success([
            'students' => $students,
            'lessons' => $lessons,
            'users' => $users,
        ], 'Arama tamamlandı.');
    }

    private function searchTeacherStudents($user, string $term): array
    {
        $allowedClassroomIds = $this->teacherAllowedClassroomIds($user);
        if (empty($allowedClassroomIds)) {
            return [];
        }

        try {
            return Student::query()
                ->where('students.tenant_id', $user->tenant_id)
                ->whereIn('students.classroom_id', $allowedClassroomIds)
                ->where(function ($query) use ($term) {
                    $query->where('students.name', 'like', $term)
                        ->orWhere('students.tc_no', 'like', $term)
                        ->orWhere('students.school_no', 'like', $term)
                        ->orWhere('students.phone', 'like', $term);
                })
                ->limit(10)
                ->get(['students.id', 'students.name', 'students.school_no', 'students.tc_no', 'students.classroom_id'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'school_no' => $s->school_no,
                    'tc_no' => $s->tc_no,
                    'url' => '/students/' . $s->id,
                ])
                ->all();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Search teacher student error: ' . $e->getMessage());
            return [];
        }
    }

    private function searchStudents(
        $user,
        ?int $tenantId,
        bool $isSuperAdmin,
        bool $isUnrestricted,
        array $userLevelIds,
        array $userCampusIds,
        array $effectiveLevelIds,
        string $term
    ): array {
        try {
            $studentQuery = Student::query();

            if ($tenantId && !$isSuperAdmin) {
                $studentQuery->where('students.tenant_id', $tenantId);
            }

            $studentQuery->where(function ($query) use ($term) {
                $query->where('students.name', 'like', $term)
                    ->orWhere('students.tc_no', 'like', $term)
                    ->orWhere('students.school_no', 'like', $term)
                    ->orWhere('students.phone', 'like', $term)
                    ->orWhere('students.email', 'like', $term);
            });

            if (!$isUnrestricted && (!empty($userLevelIds) || !empty($userCampusIds))) {
                $studentQuery
                    ->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
                    ->select('students.*')
                    ->distinct()
                    ->where(function ($q) use ($userLevelIds, $userCampusIds, $effectiveLevelIds) {
                        if (!empty($userLevelIds)) {
                            $q->whereIn('students.education_level_id', $userLevelIds)
                              ->orWhereIn('c.education_level_id', $userLevelIds)
                              ->orWhereIn('c.grade_level', array_map('strval', $userLevelIds));
                        }
                        if (!empty($userCampusIds)) {
                            $q->orWhereIn('c.campus_id', $userCampusIds);
                        }
                        if (!empty($effectiveLevelIds)) {
                            $q->orWhereIn('students.education_level_id', $effectiveLevelIds)
                              ->orWhereIn('c.education_level_id', $effectiveLevelIds)
                              ->orWhereIn('c.grade_level', array_map('strval', $effectiveLevelIds));
                        }
                    });
            }

            return $studentQuery
                ->limit(10)
                ->get(['students.id', 'students.name', 'students.school_no', 'students.tc_no', 'students.classroom_id'])
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'school_no' => $s->school_no,
                    'tc_no' => $s->tc_no,
                    'url' => '/students/' . $s->id,
                ])
                ->all();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Search student error: ' . $e->getMessage());
            return [];
        }
    }

    private function searchLessons(
        ?int $tenantId,
        bool $isSuperAdmin,
        bool $isUnrestricted,
        array $effectiveLevelIds,
        string $term
    ): array {
        try {
            $lessonQuery = Lesson::query();

            if ($tenantId && !$isSuperAdmin) {
                $lessonQuery->where('tenant_id', $tenantId);
            }

            $lessonQuery->where(function ($query) use ($term) {
                $query->where('name', 'like', $term)->orWhere('code', 'like', $term);
            });

            if (!$isUnrestricted && !empty($effectiveLevelIds)) {
                $lessonQuery->where(function ($q) use ($effectiveLevelIds) {
                    $q->whereIn('education_level_id', $effectiveLevelIds)
                      ->orWhereNull('education_level_id');
                });
            }

            return $lessonQuery
                ->limit(10)
                ->get(['id', 'name', 'code'])
                ->map(fn ($l) => [
                    'id' => $l->id,
                    'name' => $l->name,
                    'code' => $l->code,
                    'url' => '/lessons',
                ])
                ->all();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Search lesson error: ' . $e->getMessage());
            return [];
        }
    }

    private function searchUsers(
        ?int $tenantId,
        bool $isSuperAdmin,
        bool $isUnrestricted,
        array $userLevelIds,
        array $userCampusIds,
        string $term
    ): array {
        try {
            $userQuery = User::query();

            if ($tenantId && !$isSuperAdmin) {
                $userQuery->where('tenant_id', $tenantId);
            }

            $userQuery->where(function ($query) use ($term) {
                $query->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });

            if (!$isUnrestricted && (!empty($userLevelIds) || !empty($userCampusIds))) {
                $userQuery->where(function ($q) use ($userLevelIds, $userCampusIds) {
                    foreach ($userLevelIds as $lid) {
                        $q->orWhereJsonContains('education_level_ids', $lid);
                        $q->orWhereJsonContains('education_level_ids', (string) $lid);
                    }
                    foreach ($userCampusIds as $cid) {
                        $q->orWhereJsonContains('campus_ids', $cid);
                        $q->orWhereJsonContains('campus_ids', (string) $cid);
                    }
                });
            }

            return $userQuery
                ->limit(10)
                ->get(['id', 'first_name', 'last_name', 'name', 'email'])
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name ?: trim($u->first_name . ' ' . $u->last_name),
                    'email' => $u->email,
                    'url' => '/users/' . $u->id,
                ])
                ->all();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Search user error: ' . $e->getMessage());
            return [];
        }
    }
}
