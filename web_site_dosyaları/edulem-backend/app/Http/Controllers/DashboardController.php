<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Classroom;
use App\Models\Lesson;
use App\Models\Payment;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Tenant;
use App\Models\Attendance;
use App\Models\Campus;
use App\Models\EducationLevel;
use App\Models\Homework;
use App\Models\MealMenu;
use App\Models\DutySchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends ApiController
{
    /**
     * Get dashboard statistics.
     * Eksik tablolar veya hata durumunda ilgili istatistik 0 döner, 500 hatası verilmez.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        // Ensure role relation is loaded
        if ($user && !$user->relationLoaded('role')) {
            $user->load('role');
        }
        $roleName = $user?->role?->name;
        $roleId   = (int) ($user?->role_id ?? 0);

        $isUnrestricted = $this->isUnrestrictedUser($user);
        $allowedLevelIds = $isUnrestricted ? [] : $this->allowedEducationLevelIds($user);

        $scopedStudentsQuery = Student::query();
        $scopedClassroomsQuery = Classroom::query();
        $scopedLessonsQuery = Lesson::query();
        $scopedUsersQuery = User::query()->where('is_superadmin', false);

        if ($user && $user->tenant_id) {
            $scopedStudentsQuery->where('students.tenant_id', $user->tenant_id);
            $scopedClassroomsQuery->where('classrooms.tenant_id', $user->tenant_id);
            $scopedLessonsQuery->where('lessons.tenant_id', $user->tenant_id);
            $scopedUsersQuery->where('users.tenant_id', $user->tenant_id);
        }

        if (!$isUnrestricted) {
            if (empty($allowedLevelIds)) {
                $scopedStudentsQuery->whereRaw('1=0');
                $scopedClassroomsQuery->whereRaw('1=0');
                $scopedLessonsQuery->whereRaw('1=0');
                $scopedUsersQuery->whereRaw('1=0');
            } else {
                $scopedStudentsQuery
                    ->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
                    ->select('students.*')
                    ->distinct()
                    ->where(function (Builder $q) use ($allowedLevelIds) {
                        $q->whereIn('students.education_level_id', $allowedLevelIds)
                            ->orWhereIn('c.education_level_id', $allowedLevelIds)
                            ->orWhereIn('c.grade_level', array_map('strval', $allowedLevelIds));
                    });

                $scopedClassroomsQuery->where(function (Builder $q) use ($allowedLevelIds) {
                    $q->whereIn('classrooms.education_level_id', $allowedLevelIds)
                        ->orWhereIn('classrooms.grade_level', array_map('strval', $allowedLevelIds));
                });

                $scopedLessonsQuery->whereIn('education_level_id', $allowedLevelIds);

                $scopedUsersQuery->where(function (Builder $q) use ($allowedLevelIds) {
                    foreach ($allowedLevelIds as $lid) {
                        $q->orWhereJsonContains('education_level_ids', $lid);
                    }
                });
            }
        }

        $safeCount = function (string $table, $query): int {
            if (!Schema::hasTable($table)) {
                return 0;
            }
            try {
                return $query->count();
            } catch (\Throwable $e) {
                return 0;
            }
        };

        $todayMealMenus = $this->getTodayMealMenus($request, $allowedCampusIds ?? [], $allowedLevelIds ?? []);

        $stats = [
            'total_students' => $safeCount('students', $scopedStudentsQuery),
            'total_classrooms' => $safeCount('classrooms', $scopedClassroomsQuery),
            'total_lessons' => $safeCount('lessons', $scopedLessonsQuery),
            'total_payments' => $safeCount('payments', Payment::query()),
            'total_invoices' => $safeCount('invoices', Invoice::query()),
            'total_expenses' => $this->safeSum('expenses', 'amount'), // Frontend balance için tutar
            'total_tenants' => $safeCount('tenants', Tenant::query()),
            'total_payments_amount' => $this->safeSum('payments', 'amount'),
            'recent_students' => $this->getRecentStudents($request, $allowedLevelIds, $isUnrestricted),
            'recent_payments' => [],
            'today_meal_menus' => $todayMealMenus,
        ];

        if ($this->isStudentAffairsRole($roleName) || $roleId === 7) {
            try {
                $stats['student_affairs_analytics'] = $this->getStudentAffairsAnalytics($request);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Student affairs analytics error: ' . $e->getMessage());
            }
        }

        if ($this->isManagerRole($roleName)) {
            try {
                $stats['manager_analytics'] = $this->getManagerAnalytics($request);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Manager analytics error: ' . $e->getMessage());
            }
        }

        if ($this->isTeacherRole($roleName)) {
            try {
                $stats['teacher_analytics'] = $this->getTeacherAnalytics($request);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Teacher analytics error: ' . $e->getMessage());
            }
        }

        return $this->success(['stats' => $stats], 'Dashboard istatistikleri başarıyla getirildi.');
    }

    private function isStudentAffairsRole(?string $roleName): bool
    {
        if (!$roleName) return false;
        $rn = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($rn, [
            'öğrenci işleri', 'student_affairs', 'ogrenci isleri', 'ogrenci_isleri', 'öğrenci isleri', 'student affairs'
        ], true);
    }

    private function isManagerRole(?string $roleName): bool
    {
        if (!$roleName) return false;
        $rn = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($rn, [
            'müdür', 'müdür yardımcısı', 'kampüs müdürü', 'genel müdür', 
            'mudur', 'mudur yardimcisi', 'kampus muduru', 'genel mudur', 
            'owner', 'admin', 'kurucu'
        ], true);
    }

    private function isTeacherRole(?string $roleName): bool
    {
        if (!$roleName) return false;
        $rn = mb_strtolower(trim($roleName), 'UTF-8');
        return in_array($rn, [
            'öğretmen', 'sınıf öğretmeni', 'teacher', 'ogretmen', 'sinif ogretmeni',
            'rehber öğretmen', 'rehberlik', 'rehber', 'rehber_teacher', 'guidance_teacher', 'guidance',
            'rehber ogretmen'
        ], true);
    }

    private function applyManagerScopeToStudentsQuery(Builder $query, Request $request): Builder
    {
        $user = $request->user();
        if (!$user) {
            return $query;
        }

        if ($user->tenant_id) {
            $query->where('students.tenant_id', $user->tenant_id);
        }

        // Kurucu/superadmin tüm kurum; aksi durumda kampüs + kademe scope'u uygula
        if ($user->is_superadmin) {
            return $query;
        }

        $roleName = optional($user->role)->name;
        if (! $this->isManagerRole($roleName)) {
            return $query;
        }

        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        $requestedCampusId = (int) $request->query('campus_id', 0);
        $requestedEducationLevelId = (int) $request->query('education_level_id', 0);

        if ($requestedCampusId > 0) {
            if (empty($campusIds) || in_array($requestedCampusId, $campusIds, true)) {
                $campusIds = [$requestedCampusId];
            } else {
                $campusIds = [];
            }
        }

        if ($requestedEducationLevelId > 0) {
            if (empty($educationLevelIds) || in_array($requestedEducationLevelId, $educationLevelIds, true)) {
                $educationLevelIds = [$requestedEducationLevelId];
            } else {
                $educationLevelIds = [];
            }
        }

        $educationLevelCodeOrIdValues = [];
        if (!empty($educationLevelIds)) {
            $educationLevelCodes = EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->when($user->tenant_id, fn (Builder $q) => $q->where('education_levels.tenant_id', $user->tenant_id))
                ->whereIn('id', $educationLevelIds)
                ->pluck('code')
                ->filter()
                ->map(fn ($v) => (string) $v)
                ->values()
                ->all();
            $educationLevelCodeOrIdValues = array_values(array_unique(array_merge(array_map('strval', $educationLevelIds), $educationLevelCodes)));
        }

        // Kampüs/kademe seçimi yoksa: tenant bazında bırak (fail-open)
        if (empty($campusIds) && empty($educationLevelIds)) {
            return $query;
        }

        return $query->where(function (Builder $scoped) use ($campusIds, $educationLevelIds, $educationLevelCodeOrIdValues) {
            if (!empty($educationLevelIds)) {
                $scoped->where(function (Builder $q) use ($educationLevelIds, $educationLevelCodeOrIdValues) {
                    $q->whereIn('students.education_level_id', $educationLevelIds)
                        ->orWhereHas('classroom', function (Builder $cq) use ($educationLevelIds, $educationLevelCodeOrIdValues) {
                            $cq->whereIn('education_level_id', $educationLevelIds)
                               ->orWhereHas('branch', fn (Builder $bq) => $bq->whereIn('education_level_id', $educationLevelIds));
                            if (!empty($educationLevelCodeOrIdValues)) {
                                $cq->orWhereIn('grade_level', $educationLevelCodeOrIdValues);
                            }
                        });
                });
            }

            if (!empty($campusIds)) {
                $userCampusLevelIds = EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->whereIn('campus_id', $campusIds)
                    ->pluck('id')
                    ->all();

                $scoped->where(function (Builder $q) use ($campusIds, $userCampusLevelIds) {
                    $q->whereHas('classroom', function (Builder $cq) use ($campusIds) {
                        $cq->whereIn('campus_id', $campusIds)
                           ->orWhereHas('branch', fn (Builder $bq) => $bq->whereIn('campus_id', $campusIds));
                    })
                    ->orWhereHas('educationLevel', function (Builder $eq) use ($campusIds) {
                        $eq->whereIn('campus_id', $campusIds);
                    });

                    if (!empty($userCampusLevelIds)) {
                        $q->orWhereIn('students.education_level_id', $userCampusLevelIds)
                          ->orWhereHas('classroom', function (Builder $cq) use ($userCampusLevelIds) {
                              $cq->whereIn('education_level_id', $userCampusLevelIds)
                                 ->orWhereHas('branch', fn (Builder $bq) => $bq->whereIn('education_level_id', $userCampusLevelIds));
                          });
                    }
                });
            }
        });
    }

    private function applyManagerScopeToUsersQuery(Builder $query, Request $request): Builder
    {
        $user = $request->user();
        if (!$user) {
            return $query;
        }

        if ($user->tenant_id) {
            $query->where('users.tenant_id', $user->tenant_id);
        }

        if ($user->is_superadmin) {
            return $query;
        }

        $roleName = optional($user->role)->name;
        if (! $this->isManagerRole($roleName)) {
            return $query;
        }

        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        if (empty($campusIds) && empty($educationLevelIds)) {
            return $query;
        }

        return $query->where(function (Builder $scoped) use ($campusIds, $educationLevelIds) {
            if (!empty($campusIds)) {
                $scoped->where(function (Builder $q) use ($campusIds) {
                    foreach ($campusIds as $id) {
                        $q->orWhereJsonContains('campus_ids', $id);
                    }
                });
            }

            if (!empty($educationLevelIds)) {
                $scoped->where(function (Builder $q) use ($educationLevelIds) {
                    foreach ($educationLevelIds as $id) {
                        $q->orWhereJsonContains('education_level_ids', $id);
                    }
                });
            }
        });
    }

    private function getManagerAnalytics(Request $request): array
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        $requestedCampusId = (int) $request->query('campus_id', 0);
        $requestedEducationLevelId = (int) $request->query('education_level_id', 0);

        if ($requestedCampusId > 0) {
            if (empty($campusIds) || in_array($requestedCampusId, $campusIds, true)) {
                $campusIds = [$requestedCampusId];
            } else {
                $campusIds = [];
            }
        }

        if ($requestedEducationLevelId > 0) {
            if (empty($educationLevelIds) || in_array($requestedEducationLevelId, $educationLevelIds, true)) {
                $educationLevelIds = [$requestedEducationLevelId];
            } else {
                $educationLevelIds = [];
            }
        }

        $educationLevelCodeOrIdValues = [];
        if (!empty($educationLevelIds)) {
            $educationLevelCodes = EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->when($tenantId, fn (Builder $q) => $q->where('education_levels.tenant_id', $tenantId))
                ->whereIn('id', $educationLevelIds)
                ->pluck('code')
                ->filter()
                ->map(fn ($v) => (string) $v)
                ->values()
                ->all();
            $educationLevelCodeOrIdValues = array_values(array_unique(array_merge(array_map('strval', $educationLevelIds), $educationLevelCodes)));
        }

        $scopedStudents = $this->applyManagerScopeToStudentsQuery(Student::query(), $request);
        $totalStudents = (clone $scopedStudents)->count();

        $studentsByEducationLevel = $this->getManagerStudentsByEducationLevel($scopedStudents);
        $totalTeachers = $this->getManagerScopedTeacherCount($tenantId, $campusIds, $educationLevelIds, $educationLevelCodeOrIdValues);

        $todayMenus = $this->getTodayMealMenus($request, $campusIds, $educationLevelIds, $educationLevelCodeOrIdValues);
        $recentHomeworks = $this->getManagerRecentHomeworks($tenantId, $campusIds, $educationLevelIds, $educationLevelCodeOrIdValues);
        $todayDuties = $this->getManagerTodayDuties($tenantId, $campusIds, $educationLevelIds);
        $recentAnnouncements = $this->getManagerRecentAnnouncements($user, $tenantId);

        return [
            'scope' => [
                'campus_ids' => array_values($campusIds),
                'education_level_ids' => array_values($educationLevelIds),
            ],
            'totals' => [
                'total_students' => $totalStudents,
                'total_teachers' => $totalTeachers,
            ],
            'students_by_education_level' => $studentsByEducationLevel,
            'today_meal_menus' => $todayMenus,
            'recent_homeworks' => $recentHomeworks,
            'recent_announcements' => $recentAnnouncements,
            'today_duty_schedules' => $todayDuties,
        ];
    }

    private function getManagerStudentsByEducationLevel($scopedStudents): array
    {
        try {
            return (clone $scopedStudents)
                ->leftJoin('classrooms as dash_c', 'students.classroom_id', '=', 'dash_c.id')
                ->leftJoin('education_levels as sel', 'students.education_level_id', '=', 'sel.id')
                ->leftJoin('education_levels as cel', 'dash_c.education_level_id', '=', 'cel.id')
                ->selectRaw("COALESCE(sel.id, cel.id) as education_level_id, COALESCE(sel.name, cel.name, 'Tanımsız Kademe') as education_level_name, COUNT(DISTINCT students.id) as student_count")
                ->groupBy(DB::raw("COALESCE(sel.id, cel.id)"), DB::raw("COALESCE(sel.name, cel.name, 'Tanımsız Kademe')"))
                ->orderByDesc('student_count')
                ->get()
                ->map(fn ($row) => [
                    'education_level_id' => $row->education_level_id,
                    'education_level_name' => $row->education_level_name,
                    'student_count' => (int) $row->student_count,
                ])
                ->values()
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function getManagerScopedTeacherCount(?int $tenantId, array $campusIds, array $educationLevelIds, array $educationLevelCodeOrIdValues): int
    {
        $teacherRoleNames = ['Öğretmen', 'Sınıf Öğretmeni'];

        $teachersBase = User::query()
            ->when($tenantId, fn (Builder $q) => $q->where('users.tenant_id', $tenantId))
            ->where('is_active', true)
            ->whereHas('role', fn (Builder $q) => $q->whereIn('name', $teacherRoleNames));

        if (empty($campusIds) && empty($educationLevelIds)) {
            return (clone $teachersBase)->count();
        }

        $scopedClassrooms = Classroom::query()
            ->when($tenantId, fn (Builder $q) => $q->where('classrooms.tenant_id', $tenantId))
            ->whereNotNull('teacher_id');

        if (!empty($educationLevelIds)) {
            $scopedClassrooms->where(function (Builder $cq) use ($educationLevelIds, $educationLevelCodeOrIdValues) {
                $cq->whereIn('education_level_id', $educationLevelIds);
                if (!empty($educationLevelCodeOrIdValues)) {
                    $cq->orWhereIn('grade_level', $educationLevelCodeOrIdValues);
                }
            });
        }

        if (!empty($campusIds)) {
            $scopedClassrooms->whereIn('campus_id', $campusIds);
        }

        $classroomTeacherIds = $scopedClassrooms
            ->distinct()
            ->pluck('teacher_id')
            ->filter()
            ->map(fn ($v) => (int) $v)
            ->values()
            ->all();

        $teachersScoped = (clone $teachersBase)->where(function (Builder $q) use ($campusIds, $educationLevelIds, $classroomTeacherIds) {
            $hasAny = false;

            if (!empty($classroomTeacherIds)) {
                $q->whereIn('users.id', $classroomTeacherIds);
                $hasAny = true;
            }

            if (!empty($campusIds)) {
                $q->orWhere(function (Builder $sub) use ($campusIds) {
                    foreach ($campusIds as $id) {
                        $sub->orWhereJsonContains('campus_ids', $id);
                    }
                });
                $hasAny = true;
            }

            if (!empty($educationLevelIds)) {
                $q->orWhere(function (Builder $sub) use ($educationLevelIds) {
                    foreach ($educationLevelIds as $id) {
                        $sub->orWhereJsonContains('education_level_ids', $id);
                    }
                });
                $hasAny = true;
            }

            if (!$hasAny) {
                $q->whereRaw('1=1');
            }
        });

        return $teachersScoped->distinct('users.id')->count('users.id');
    }

    private function getManagerRecentHomeworks(?int $tenantId, array $campusIds, array $educationLevelIds, array $educationLevelCodeOrIdValues): array
    {
        $homeworkQuery = Homework::query()
            ->with(['classroom', 'teacher', 'lesson'])
            ->when($tenantId, fn (Builder $q) => $q->where('homeworks.tenant_id', $tenantId));

        if (!empty($campusIds) || !empty($educationLevelIds)) {
            $homeworkQuery->whereHas('classroom', function (Builder $cq) use ($campusIds, $educationLevelIds, $educationLevelCodeOrIdValues) {
                if (!empty($campusIds)) {
                    $cq->whereIn('campus_id', $campusIds);
                }
                if (!empty($educationLevelIds)) {
                    $cq->where(function (Builder $sub) use ($educationLevelIds, $educationLevelCodeOrIdValues) {
                        $sub->whereIn('education_level_id', $educationLevelIds);
                        if (!empty($educationLevelCodeOrIdValues)) {
                            $sub->orWhereIn('grade_level', $educationLevelCodeOrIdValues);
                        }
                    });
                }
            });
        }

        return $homeworkQuery
            ->orderByDesc('created_at')
            ->get()
            ->unique('teacher_id')
            ->take(5)
            ->map(fn (Homework $hw) => [
                'id' => $hw->id,
                'title' => $hw->title,
                'due_date' => $hw->due_date ? Carbon::parse($hw->due_date)->toDateString() : null,
                'created_at' => $hw->created_at?->toIso8601String(),
                'classroom' => $hw->classroom ? [
                    'id' => $hw->classroom->id,
                    'name' => $hw->classroom->name,
                ] : null,
                'teacher' => $hw->teacher ? [
                    'id' => $hw->teacher->id,
                    'name' => $hw->teacher->name,
                ] : null,
                'lesson' => $hw->lesson ? [
                    'id' => $hw->lesson->id,
                    'name' => $hw->lesson->name,
                ] : null,
            ])
            ->values()
            ->all();
    }

    private function getManagerTodayDuties(?int $tenantId, array $campusIds, array $educationLevelIds): array
    {
        $todayDayOfWeek = Carbon::today()->englishDayOfWeek;

        return DutySchedule::query()
            ->with(['user'])
            ->when($tenantId, fn (Builder $q) => $q->where('duty_schedules.tenant_id', $tenantId))
            ->where('is_active', true)
            ->where('day_of_week', $todayDayOfWeek)
            ->when(!empty($campusIds), fn (Builder $q) => $q->whereIn('campus_id', $campusIds))
            ->when(!empty($educationLevelIds), fn (Builder $q) => $q->whereIn('education_level_id', $educationLevelIds))
            ->orderBy('start_time')
            ->get()
            ->map(fn (DutySchedule $d) => [
                'id' => $d->id,
                'day_of_week' => $d->day_of_week,
                'start_time' => $d->start_time,
                'end_time' => $d->end_time,
                'location' => $d->location,
                'notes' => $d->notes,
                'user' => $d->user ? [
                    'id' => $d->user->id,
                    'name' => $d->user->name,
                ] : null,
            ])
            ->values()
            ->all();
    }

    private function getManagerRecentAnnouncements($user, ?int $tenantId): array
    {
        $userRoleId = $user->role_id ?? null;
        $userRoleName = null;
        try {
            $userRoleName = $user->role->name ?? null;
        } catch (\Throwable $e) {
            $userRoleName = null;
        }

        $userId = $user->id;
        return \App\Models\Announcement::query()
            ->with(['creator'])
            ->leftJoin('announcement_reads as ar_u', function ($j) use ($userId) {
                $j->on('announcements.id', '=', 'ar_u.announcement_id')->where('ar_u.user_id', '=', $userId);
            })
            ->when($tenantId, fn (Builder $q) => $q->where('announcements.tenant_id', $tenantId))
            ->where('status', 'published')
            ->where(function ($q) use ($userRoleId, $userRoleName) {
                $q->whereNull('target_roles');
                if ($userRoleId) {
                    $q->orWhereJsonContains('target_roles', (int) $userRoleId);
                }
                if ($userRoleName) {
                    $q->orWhereJsonContains('target_roles', (string) $userRoleName);
                }
            })
            ->where(function ($query) {
                $query->where(function($sq) {
                    $sq->whereNull('ar_u.is_deleted')->orWhere('ar_u.is_deleted', 0);
                })->where(function($sq) {
                    $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0);
                });
            })
            ->orderByDesc('announcements.created_at')
            ->limit(5)
            ->get(['announcements.*'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'user_name' => $a->creator->name ?? $a->creator->email ?? 'Sistem',
                'created_at' => $a->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function getTodayMealMenus(Request $request, array $campusIds = [], array $educationLevelIds = [], array $educationLevelCodeOrIdValues = []): array
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;
        $today = Carbon::today()->toDateString();

        $menusQuery = MealMenu::query()
            ->with(['classroom'])
            ->when($tenantId, fn (Builder $q) => $q->where('meal_menus.tenant_id', $tenantId))
            ->whereDate('menu_date', $today)
            ->where('is_published', true);

        if (!empty($campusIds) || !empty($educationLevelIds)) {
            $menusQuery->where(function (Builder $q) use ($campusIds, $educationLevelIds, $educationLevelCodeOrIdValues) {
                $q->whereNull('classroom_id');
                $q->orWhereHas('classroom', function (Builder $cq) use ($campusIds, $educationLevelIds, $educationLevelCodeOrIdValues) {
                    if (!empty($campusIds)) {
                        $cq->whereIn('campus_id', $campusIds);
                    }
                    if (!empty($educationLevelIds)) {
                        $cq->where(function (Builder $sub) use ($educationLevelIds, $educationLevelCodeOrIdValues) {
                            $sub->whereIn('education_level_id', $educationLevelIds);
                            if (!empty($educationLevelCodeOrIdValues)) {
                                $sub->orWhereIn('grade_level', $educationLevelCodeOrIdValues);
                            }
                        });
                    }
                });
            });
        }

        return $menusQuery
            ->orderBy('meal_type')
            ->get()
            ->map(fn (MealMenu $m) => [
                'id' => $m->id,
                'menu_date' => $m->menu_date ? Carbon::parse($m->menu_date)->toDateString() : null,
                'meal_type' => $m->meal_type,
                'meals' => $m->meals,
                'notes' => $m->notes,
                'classroom' => $m->classroom ? [
                    'id' => $m->classroom->id,
                    'name' => $m->classroom->name,
                ] : null,
            ])
            ->values()
            ->all();
    }

    private function applyStudentAffairsScope(Builder $query, Request $request): Builder
    {
        $user = $request->user();
        if (!$user) {
            return $query;
        }

        if ($user->tenant_id) {
            $query->where('students.tenant_id', $user->tenant_id);
        }

        if ($user->is_superadmin || !$this->isStudentAffairsRole(optional($user->role)->name)) {
            return $query;
        }

        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        return $query->where(function (Builder $scoped) use ($campusIds, $educationLevelIds) {
            // 1. Sınıf üzerinden kontrol
            $scoped->whereHas('classroom', function (Builder $classroomQuery) use ($campusIds, $educationLevelIds) {
                if (!empty($campusIds)) {
                    $classroomQuery->whereIn('campus_id', $campusIds);
                }

                if (!empty($educationLevelIds)) {
                    $classroomQuery->where(function($q) use ($educationLevelIds) {
                        $q->whereIn('grade_level', $educationLevelIds)
                          ->orWhereIn('education_level_id', $educationLevelIds);
                    });
                }
            });

            // 2. Doğrudan kademe üzerinden kontrol
            $scoped->orWhere(function (Builder $studentScopeQuery) use ($campusIds, $educationLevelIds) {
                $studentScopeQuery->whereHas('educationLevel', function (Builder $educationLevelQuery) use ($campusIds, $educationLevelIds) {
                    if (!empty($campusIds)) {
                        $educationLevelQuery->whereIn('campus_id', $campusIds);
                    }
                    if (!empty($educationLevelIds)) {
                        $educationLevelQuery->whereIn('id', $educationLevelIds);
                    }
                });
            });
        });
    }

    private function getStudentAffairsAnalytics(Request $request): array
    {
        $user = $request->user();
        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

        $scopedStudents = $this->applyStudentAffairsScope(Student::query(), $request);

        $totalStudents = (clone $scopedStudents)->count();
        $activeStudents = (clone $scopedStudents)->where('is_active', true)->count();
        $inactiveStudents = (clone $scopedStudents)->where('is_active', false)->count();

        $attendanceStatusCounts = Attendance::query()
            ->whereDate('date', Carbon::today()->toDateString())
            ->whereIn('student_id', (clone $scopedStudents)->select('id'))
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $absentToday = (int) ($attendanceStatusCounts['absent'] ?? 0);
        $presentToday = (int) ($attendanceStatusCounts['present'] ?? 0);
        $lateToday = (int) ($attendanceStatusCounts['late'] ?? 0);
        $excusedToday = (int) ($attendanceStatusCounts['excused'] ?? 0);
        $sickToday = (int) ($attendanceStatusCounts['sick'] ?? 0);
        $attendanceTotal = $presentToday + $absentToday + $lateToday + $excusedToday + $sickToday;

        $studentsByEducationLevel = (clone $scopedStudents)
            ->leftJoin('education_levels', 'education_levels.id', '=', 'students.education_level_id')
            ->selectRaw('education_levels.id as education_level_id, COALESCE(education_levels.name, ?) as education_level_name, COUNT(students.id) as student_count', ['Tanımsız Kademe'])
            ->groupBy('education_levels.id', 'education_levels.name')
            ->orderByDesc('student_count')
            ->get()
            ->map(fn ($row) => [
                'education_level_id' => $row->education_level_id,
                'education_level_name' => $row->education_level_name,
                'student_count' => (int) $row->student_count,
            ])
            ->values()
            ->all();

        $studentsByClassroom = (clone $scopedStudents)
            ->join('classrooms', 'classrooms.id', '=', 'students.classroom_id')
            ->selectRaw('classrooms.id as classroom_id, classrooms.name as classroom_name, COUNT(students.id) as student_count')
            ->groupBy('classrooms.id', 'classrooms.name')
            ->orderByDesc('student_count')
            ->limit(12)
            ->get()
            ->map(fn ($row) => [
                'classroom_id' => $row->classroom_id,
                'classroom_name' => $row->classroom_name,
                'student_count' => (int) $row->student_count,
            ])
            ->values()
            ->all();

        return [
            'scope' => [
                'campuses' => Campus::query()
                    ->where('tenant_id', $user->tenant_id)
                    ->when(!empty($campusIds), fn ($query) => $query->whereIn('id', $campusIds))
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn ($campus) => ['id' => $campus->id, 'name' => $campus->name])
                    ->values()
                    ->all(),
                'education_levels' => EducationLevel::query()
                    ->where('tenant_id', $user->tenant_id)
                    ->when(!empty($educationLevelIds), fn ($query) => $query->whereIn('id', $educationLevelIds))
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->map(fn ($educationLevel) => ['id' => $educationLevel->id, 'name' => $educationLevel->name])
                    ->values()
                    ->all(),
            ],
            'totals' => [
                'total_students' => $totalStudents,
                'active_students' => $activeStudents,
                'inactive_students' => $inactiveStudents,
            ],
            'attendance_today' => [
                'date' => Carbon::today()->toDateString(),
                'present' => $presentToday,
                'absent' => $absentToday,
                'late' => $lateToday,
                'excused' => $excusedToday,
                'sick' => $sickToday,
                'total_records' => $attendanceTotal,
                'absence_rate' => $attendanceTotal > 0 ? round(($absentToday / $attendanceTotal) * 100, 2) : 0,
            ],
            'students_by_education_level' => $studentsByEducationLevel,
            'students_by_classroom' => $studentsByClassroom,
            'today_meal_menus' => $this->getTodayMealMenus($request, $campusIds, $educationLevelIds),
        ];
    }

    private function getTeacherAnalytics(Request $request): array
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        $todayDayIndex = Carbon::today()->dayOfWeekIso; // 1 = Monday, 7 = Sunday
        $todayDayName = strtolower(Carbon::today()->englishDayOfWeek); // monday, tuesday...

        $schedules = \App\Models\Schedule::query()
            ->with(['classroom', 'lesson'])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->where(function ($q) use ($user) {
                $q->where('teacher_id', $user->id)
                  ->orWhereJsonContains('assistant_teacher_ids', $user->id);
            })
            ->get();

        $totalClasses = collect($schedules)->unique('classroom_id')->count();
        $totalStudents = 0;
        
        $classroomIds = $schedules->pluck('classroom_id')->unique()->filter()->all();
        if (!empty($classroomIds)) {
            $totalStudents = Student::query()
                ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
                ->whereIn('classroom_id', $classroomIds)
                ->count();
        }

        $todayTimeline = $this->getTeacherTodayTimeline($schedules, $todayDayIndex, $todayDayName);
        $nextLesson = collect($todayTimeline)->firstWhere(fn($s) => $s['status'] === 'future' || $s['status'] === 'current');
        $recentAnnouncements = $this->getTeacherRecentAnnouncements($user, $tenantId);

        return [
            'total_students' => $totalStudents,
            'total_classes' => $totalClasses,
            'next_lesson' => $nextLesson,
            'today_timeline' => $todayTimeline,
            'recent_announcements' => $recentAnnouncements,
            'today_meal_menus' => $this->getTodayMealMenus($request),
        ];
    }

    private function getTeacherTodayTimeline($schedules, int $todayDayIndex, string $todayDayName): array
    {
        return collect($schedules)->filter(function ($s) use ($todayDayIndex, $todayDayName) {
            $day = (string)$s->day_of_week;
            return $day === (string)$todayDayIndex || strtolower($day) === $todayDayName;
        })->sortBy('start_time')->map(function ($s) {
            $now = Carbon::now();
            $start = Carbon::parse($s->start_time);
            $end = Carbon::parse($s->end_time);

            $status = 'future';
            if ($now->between($start, $end)) {
                $status = 'current';
            } elseif ($now->greaterThan($end)) {
                $status = 'past';
            }

            return [
                'id' => $s->id,
                'course' => $s->lesson ? $s->lesson->name : '',
                'classroom' => $s->classroom ? $s->classroom->name : '',
                'room' => $s->room ?? '',
                'time_start' => $start->format('H:i'),
                'time_end' => $end->format('H:i'),
                'status' => $status,
            ];
        })->values()->all();
    }

    private function getTeacherRecentAnnouncements($user, ?int $tenantId): array
    {
        $userRoleId = $user->role_id ?? null;
        $userRoleName = null;
        try {
            $userRoleName = $user->role->name ?? null;
        } catch (\Throwable $e) {
            $userRoleName = null;
        }

        return \App\Models\Announcement::query()
            ->with(['creator'])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('status', 'published')
            ->where(function ($q) use ($userRoleId, $userRoleName) {
                $q->whereNull('target_roles');
                if ($userRoleId) {
                    $q->orWhereJsonContains('target_roles', (int) $userRoleId);
                }
                if ($userRoleName) {
                    $q->orWhereJsonContains('target_roles', (string) $userRoleName);
                }
            })
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'message' => $a->message,
                'type' => $a->type,
                'user_name' => $a->creator->name ?? $a->creator->email ?? 'Sistem',
                'created_at' => $a->created_at?->toIso8601String(),
            ])
            ->all();
    }

    private function safeSum(string $table, string $column): float
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }
        try {
            return (float) DB::table($table)->sum($column);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    private function getRecentStudents(Request $request, array $allowedLevelIds = [], bool $isUnrestricted = false): array
    {
        if (!Schema::hasTable('students')) {
            return [];
        }
        try {
            $user = $request->user();
            $query = Student::query();

            if ($user && $user->tenant_id) {
                $query->where('students.tenant_id', $user->tenant_id);
            }

            if (!$isUnrestricted) {
                if (empty($allowedLevelIds)) {
                    $query->whereRaw('1=0');
                } else {
                    $query
                        ->leftJoin('classrooms as c', 'students.classroom_id', '=', 'c.id')
                        ->select('students.*')
                        ->distinct()
                        ->where(function (Builder $q) use ($allowedLevelIds) {
                            $q->whereIn('students.education_level_id', $allowedLevelIds)
                                ->orWhereIn('c.education_level_id', $allowedLevelIds)
                                ->orWhereIn('c.grade_level', array_map('strval', $allowedLevelIds));
                        });
                }
            }

            return $query
                ->orderByDesc('created_at')
                ->limit(5)
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'school_no' => $s->school_no ?? '',
                    'created_at' => $s->created_at?->toIso8601String(),
                ])
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }
}
