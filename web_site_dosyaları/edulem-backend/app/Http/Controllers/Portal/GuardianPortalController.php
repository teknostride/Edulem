<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\ApiController;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\OnlineExam;
use App\Models\FormSurvey;
use App\Models\OnlineSurvey;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class GuardianPortalController extends ApiController
{
    /**
     * Guardian portal login.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required_without:email|string',
            'email' => 'required_without:phone|email',
            'password' => 'required|string',
            'device_name' => 'sometimes|string|max:255',
        ]);

        $guardian = null;
        if ($request->phone) {
            $guardian = Guardian::where('phone', $request->phone)->first();
        } elseif ($request->email) {
            $guardian = Guardian::where('email', $request->email)->first();
        }

        if (!$guardian || !Hash::check($request->password, $guardian->password)) {
            return $this->error('Giriş bilgileri hatalı.', [], 401);
        }

        if (!$guardian->is_portal_active) {
            return $this->error('Portal erişimi aktif değil.', [], 403);
        }

        // Token oluştur
        $token = $guardian->createToken($request->device_name ?? 'portal-token')->plainTextToken;

        // Son giriş tarihini güncelle
        $guardian->update(['last_login_at' => now()]);

        return $this->success([
            'guardian' => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone' => $guardian->phone,
                'email' => $guardian->email,
            ],
            'token' => $token,
        ], 'Giriş başarılı.');
    }

    /**
     * Get guardian dashboard data.
     */
    public function dashboard(Request $request): JsonResponse
    {
        /** @var Guardian $guardian */
        $guardian = $request->user(); // Sanctum authenticated guardian

        $students = $this->fetchDashboardStudents($guardian);
        $announcements = $this->fetchDashboardAnnouncements($guardian, $students);
        $todayMenus = $this->fetchDashboardTodayMenus($guardian, $students);

        // Son mesajlar
        $messages = \App\Models\InternalMessage::whereHas('recipients', function ($q) use ($guardian) {
            $q->where('recipient_id', $guardian->id)
                ->where('recipient_type', 'guardian');
        })
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return $this->success([
            'guardian' => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone' => $guardian->phone,
                'email' => $guardian->email,
            ],
            'students' => $students->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'student_name' => $student->name,
                    'school_no' => $student->school_no,
                    'tc_no' => $student->tc_no,
                    'classroom' => $student->classroom ? [
                        'id' => $student->classroom->id,
                        'name' => $student->classroom->name,
                    ] : null,
                    'classroom_name' => $student->classroom?->name,
                ];
            }),
            'today_menu' => $todayMenus[0] ?? null,
            'today_menus' => $todayMenus,
            'announcements' => $announcements,
            'messages' => $messages,
        ], 'Dashboard verileri başarıyla getirildi.');
    }

    private function fetchDashboardStudents($guardian)
    {
        if ($guardian instanceof Student) {
            $student = $guardian;
            $parentGuardian = $student->guardians()->orderBy('guardian_student.created_at')->orderBy('guardians.id')->first();
            $portalSiblings = app(\App\Http\Controllers\Portal\StudentPortalController::class)->getPortalSiblings($student, $parentGuardian);
            return collect([$student])->concat($portalSiblings);
        }

        $guardianStudentIds = $guardian && method_exists($guardian, 'students')
            ? $guardian->students()
                ->withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->pluck('students.id')
            : collect();

        $siblingStudentIds = \DB::table('student_siblings')
            ->whereIn('student_id', $guardianStudentIds)
            ->orWhereIn('sibling_id', $guardianStudentIds)
            ->pluck('sibling_id')
            ->concat(\DB::table('student_siblings')->whereIn('sibling_id', $guardianStudentIds)->pluck('student_id'));

        $allStudentIds = $guardianStudentIds->concat($siblingStudentIds)->unique()->filter()->values();

        $rawStudents = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('id', $allStudentIds)
            ->with(['classroom', 'tenant'])
            ->orderBy('students.id', 'desc')
            ->get();

        return $rawStudents->groupBy(function ($s) {
            return $s->tenant_id . '_' . ($s->tc_no ?: $s->school_no ?: $s->id);
        })->map(function ($group) {
            if ($group->count() === 1) {
                return $group->first();
            }

            $active = $group->first(function ($s) {
                if (!$s->season_id) return false;
                return \App\Models\Season::where('id', $s->season_id)
                    ->where('is_active', true)
                    ->exists();
            });

            return $active ?? $group->sortByDesc('season_id')->sortByDesc('id')->first();
        })->values();
    }

    private function fetchDashboardAnnouncements(Guardian $guardian, $students)
    {
        return \App\Models\Announcement::query()
            ->leftJoin('announcement_reads as ar_u', function ($j) use ($guardian) {
                $j->on('announcements.id', '=', 'ar_u.announcement_id')->where('ar_u.user_id', '=', $guardian->id);
            })
            ->where('status', 'published')
            ->where(function ($q) use ($students) {
                $q->whereJsonContains('target_audience', [['type' => 'all']])
                    ->orWhereJsonContains('target_audience', [['type' => 'guardians']])
                    ->orWhereIn('target_audience', function ($sq) use ($students) {
                        $sq->select('id')
                            ->from('students')
                            ->whereIn('id', $students->pluck('id'));
                    });
            })
            ->where(function ($query) {
                $query->where(function ($sq) {
                    $sq->whereNull('ar_u.is_deleted')->orWhere('ar_u.is_deleted', 0);
                })->where(function ($sq) {
                    $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0);
                });
            })
            ->orderBy('announcements.created_at', 'desc')
            ->limit(5)
            ->get(['announcements.*']);
    }

    private function fetchDashboardTodayMenus(Guardian $guardian, $students): array
    {
        $studentClassroomIds = $students->pluck('classroom_id')->filter()->all();
        $studentIds = $students->pluck('id')->all();

        return \App\Models\MealMenu::query()
            ->where('tenant_id', $guardian->tenant_id)
            ->whereDate('menu_date', now()->toDateString())
            ->where('is_published', true)
            ->where(function ($q) use ($studentClassroomIds, $studentIds) {
                $q->whereNull('classroom_id');
                if (!empty($studentClassroomIds)) {
                    $q->orWhereIn('classroom_id', $studentClassroomIds);
                }
                foreach ($studentIds as $sId) {
                    $q->orWhereJsonContains('target_student_ids', $sId);
                }
            })
            ->orderBy('meal_type')
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'menu_date' => $m->menu_date ? Carbon::parse($m->menu_date)->format('Y-m-d') : null,
                    'meal_type' => $m->meal_type,
                    'meals' => $m->meals,
                    'notes' => $m->notes,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Get student details (for guardian).
     */
    public function getStudent(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        // Guardian'ın bu öğrenciye erişimi var mı kontrol et
        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $student->load(['classroom', 'city', 'district', 'guardians']);

        return $this->success([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'school_no' => $student->school_no,
                'classroom' => $student->classroom ? [
                    'id' => $student->classroom->id,
                    'name' => $student->classroom->name,
                ] : null,
            ],
        ], 'Öğrenci bilgileri başarıyla getirildi.');
    }

    /**
     * Get student schedule.
     */
    public function getStudentSchedule(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        $hasAccess = $guardian->students()
            ->withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('students.id', $student->id)
            ->exists();

        if (!$hasAccess) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Eğer gönderilen öğrenci eski sezona aitse, aktif sezondaki eşdeğer kaydını bul
        $activeSeasonId = \App\Models\Season::where('tenant_id', $student->tenant_id)
            ->where('is_active', true)
            ->value('id');

        if ($activeSeasonId && (int) $student->season_id !== (int) $activeSeasonId) {
            $activeStudent = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $student->tenant_id)
                ->where('season_id', $activeSeasonId)
                ->where(function ($q) use ($student) {
                    if (!empty($student->tc_no)) {
                        $q->where('tc_no', $student->tc_no);
                    } elseif (!empty($student->school_no)) {
                        $q->where('school_no', $student->school_no);
                    }
                })
                ->first();

            if ($activeStudent) {
                $student = $activeStudent;
            }
        }

        if (!$student->classroom_id) {
            return $this->error('Öğrenci bir sınıfa atanmamış.', [], 400);
        }

        $schedules = \App\Models\Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('classroom_id', $student->classroom_id)
            ->with(['lesson', 'teacher'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return $this->success([
            'schedules' => $schedules->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'lesson' => $schedule->lesson ? [
                        'id' => $schedule->lesson->id,
                        'name' => $schedule->lesson->name,
                    ] : null,
                    'teacher' => $schedule->teacher ? [
                        'id' => $schedule->teacher->id,
                        'name' => $schedule->teacher->name,
                    ] : null,
                    'remote_link' => $schedule->remote_link,
                ];
            }),
        ], 'Ders programı başarıyla getirildi.');
    }

    /**
     * Get student homework.
     */
    public function getStudentHomework(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        $hasAccess = $guardian->students()
            ->withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('students.id', $student->id)
            ->exists();

        if (!$hasAccess) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Eğer gönderilen öğrenci eski sezona aitse, aktif sezondaki eşdeğer kaydını bul
        $activeSeasonId = \App\Models\Season::where('tenant_id', $student->tenant_id)
            ->where('is_active', true)
            ->value('id');

        if ($activeSeasonId && (int) $student->season_id !== (int) $activeSeasonId) {
            $activeStudent = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('tenant_id', $student->tenant_id)
                ->where('season_id', $activeSeasonId)
                ->where(function ($q) use ($student) {
                    if (!empty($student->tc_no)) {
                        $q->where('tc_no', $student->tc_no);
                    } elseif (!empty($student->school_no)) {
                        $q->where('school_no', $student->school_no);
                    }
                })
                ->first();

            if ($activeStudent) {
                $student = $activeStudent;
            }
        }

        $query = \App\Models\Homework::where(function ($q) use ($student) {
                $q->whereHas('assignments', fn ($aq) => $aq->where('student_id', $student->id));
                if ($student->classroom_id) {
                    $q->orWhere('classroom_id', $student->classroom_id);
                }
            })
            ->where('is_active', true)
            ->with([
                'lesson',
                'teacher',
                'file',
                'classroom',
                'assignments' => function ($q) use ($student) {
                    $q->where('student_id', $student->id);
                },
            ]);

        // Online ödevler filtresi
        if ($request->has('is_online')) {
            $query->where('is_online', $request->is_online);
        }

        // Proje ödevi filtresi
        if ($request->has('is_project')) {
            $query->where('is_project', $request->is_project);
        }

        $homeworks = $query->orderBy('due_date', 'desc')->paginate(20);

        return $this->success([
            'homeworks' => $homeworks->map(function ($homework) use ($student) {
                $submission = $homework->submissions()->where('student_id', $student->id)->first();
                $assignment = $homework->assignments->first();
                $isChecked = !empty($assignment?->review_status);
                $isOverdue = $homework->due_date && \Illuminate\Support\Carbon::parse($homework->due_date)->endOfDay()->isPast();

                return [
                    'id' => $homework->id,
                    'title' => $homework->title,
                    'description' => $homework->description,
                    'due_date' => $homework->due_date?->format('Y-m-d'),
                    'is_online' => $homework->is_online,
                    'is_project' => $homework->is_project,
                    'project_topics' => $homework->project_topics,
                    'is_checked' => $isChecked,
                    'review_status' => $assignment?->review_status,
                    'status' => $isChecked ? ($assignment?->review_status ?? 'submitted') : ($isOverdue ? 'overdue' : 'pending'),
                    'file' => $homework->file ? [
                        'id' => $homework->file->id,
                        'name' => $homework->file->name,
                        'url' => $homework->file->url ?? ($homework->file->path ? asset('storage/' . $homework->file->path) : null),
                    ] : null,
                    'submission' => $submission ? [
                        'id' => $submission->id,
                        'status' => $submission->status,
                        'submitted_at' => $submission->submitted_at?->format('Y-m-d H:i'),
                        'grade' => $submission->score,
                        'selected_topic' => $submission->project_topic_id !== null && isset($homework->project_topics[$submission->project_topic_id]) 
                            ? $homework->project_topics[$submission->project_topic_id] 
                            : null,
                    ] : null,
                    'lesson' => $homework->lesson ? [
                        'id' => $homework->lesson->id,
                        'name' => $homework->lesson->name,
                    ] : null,
                    'classroom' => $homework->classroom ? [
                        'id' => $homework->classroom->id,
                        'name' => $homework->classroom->name,
                    ] : ($student->classroom ? [
                        'id' => $student->classroom->id,
                        'name' => $student->classroom->name,
                    ] : null),
                    'teacher' => $homework->teacher ? [
                        'id' => $homework->teacher->id,
                        'name' => $homework->teacher->name,
                    ] : null,
                    'review' => [
                        'status' => $assignment?->review_status,
                        'status_label' => match ($assignment?->review_status) {
                            'done' => 'Yapıldı',
                            'completed' => 'Tamamlandı',
                            'partial' => 'Eksik',
                            'not_done' => 'Yapılmadı',
                            'absent' => 'Gelmedi',
                            'missing' => 'Gelmedi',
                            default => 'Değerlendirilmedi',
                        },
                        'teacher_note' => $assignment?->teacher_note,
                        'reviewed_at' => $assignment?->reviewed_at?->format('Y-m-d H:i'),
                    ],
                ];
            }),
            'pagination' => [
                'current_page' => $homeworks->currentPage(),
                'last_page' => $homeworks->lastPage(),
                'per_page' => $homeworks->perPage(),
                'total' => $homeworks->total(),
            ],
        ], 'Ödevler başarıyla getirildi.');
    }

    /**
     * Get student homework control report.
     */
    public function getStudentHomeworkControlReport(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $homeworks = \App\Models\Homework::where('classroom_id', $student->classroom_id)
            ->whereBetween('due_date', [$startDate, $endDate])
            ->with(['lesson', 'teacher', 'submissions' => function ($q) use ($student) {
                $q->where('student_id', $student->id);
            }])
            ->get();

        $totalHomeworks = $homeworks->count();
        $submittedCount = $homeworks->filter(function ($hw) {
            return $hw->submissions->isNotEmpty() && $hw->submissions->first()->status !== 'pending';
        })->count();
        $gradedCount = $homeworks->filter(function ($hw) {
            return $hw->submissions->isNotEmpty() && $hw->submissions->first()->status === 'graded';
        })->count();
        $pendingCount = $totalHomeworks - $submittedCount;
        $averageScore = $homeworks->flatMap->submissions->where('status', 'graded')->avg('score');

        return $this->success([
            'student_id' => $student->id,
            'student_name' => $student->name,
            'period' => [
                'from' => $startDate,
                'to' => $endDate,
            ],
            'statistics' => [
                'total_homeworks' => $totalHomeworks,
                'submitted_count' => $submittedCount,
                'graded_count' => $gradedCount,
                'pending_count' => $pendingCount,
                'average_score' => $averageScore ? round($averageScore, 2) : null,
                'submission_rate' => $totalHomeworks > 0 ? round(($submittedCount / $totalHomeworks) * 100, 2) : 0,
                'grading_rate' => $submittedCount > 0 ? round(($gradedCount / $submittedCount) * 100, 2) : 0,
            ],
            'homeworks' => $homeworks->map(function ($homework) {
                $submission = $homework->submissions->first();
                return [
                    'id' => $homework->id,
                    'title' => $homework->title,
                    'due_date' => $homework->due_date?->format('Y-m-d'),
                    'lesson' => $homework->lesson?->name,
                    'teacher' => $homework->teacher?->name,
                    'submission_status' => $submission ? $submission->status : 'not_submitted',
                    'submitted_at' => $submission?->submitted_at?->format('Y-m-d H:i'),
                    'graded_at' => $submission?->graded_at?->format('Y-m-d H:i'),
                    'score' => $submission?->score,
                    'teacher_notes' => $submission?->teacher_notes,
                ];
            }),
        ], 'Ödev kontrol raporu başarıyla getirildi.');
    }

    /**
     * Get student attendance.
     */
    public function getStudentAttendance(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $attendances = \App\Models\Attendance::where('student_id', $student->id)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->with(['lesson', 'teacher'])
            ->orderBy('attendance_date', 'desc')
            ->get();

        return $this->success([
            'attendances' => $attendances->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'attendance_date' => $attendance->attendance_date?->format('Y-m-d'),
                    'status' => $attendance->status,
                    'lesson' => $attendance->lesson ? [
                        'id' => $attendance->lesson->id,
                        'name' => $attendance->lesson->name,
                    ] : null,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Devamsızlık bilgileri başarıyla getirildi.');
    }

    /**
     * Get student grades.
     */
    public function getStudentGrades(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $grades = \App\Models\Grade::where('student_id', $student->id)
            ->with(['exam', 'lesson'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success([
            'grades' => $grades->map(function ($grade) {
                return [
                    'id' => $grade->id,
                    'score' => $grade->score,
                    'grade_type' => $grade->grade_type,
                    'exam' => $grade->exam ? [
                        'id' => $grade->exam->id,
                        'name' => $grade->exam->name,
                        'exam_date' => $grade->exam->exam_date?->format('Y-m-d'),
                    ] : null,
                    'lesson' => $grade->lesson ? [
                        'id' => $grade->lesson->id,
                        'name' => $grade->lesson->name,
                    ] : null,
                ];
            }),
        ], 'Notlar başarıyla getirildi.');
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        return app(\App\Http\Controllers\Portal\StudentPortalController::class)->changePassword($request);
    }

    /**
     * Get guardian profile.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $actor = $request->user();

        if ($actor instanceof Student) {
            $data = $this->getStudentActorProfile($actor);
        } elseif ($actor instanceof Guardian) {
            $data = $this->getGuardianActorProfile($actor);
        } else {
            return $this->error('Yetkisiz işlem.', [], 401);
        }

        return $this->success($data, 'Profil başarıyla getirildi.');
    }

    private function getStudentActorProfile(Student $student): array
    {
        $guardian = $student->guardians()->orderBy('guardian_student.created_at')->orderBy('guardians.id')->first();
        $portalSiblings = app(\App\Http\Controllers\Portal\StudentPortalController::class)->getPortalSiblings($student, $guardian);
        $currentStudentObj = [
            'id' => $student->id,
            'name' => $student->name,
            'student_name' => $student->name,
            'school_no' => $student->school_no,
            'tc_no' => $student->tc_no,
            'classroom' => $student->classroom ? [
                'id' => $student->classroom->id,
                'name' => $student->classroom->name,
            ] : null,
            'classroom_name' => $student->classroom?->name,
            'phone' => $student->phone,
        ];
        $allSiblings = collect([$currentStudentObj])->concat($portalSiblings);

        $campusName = $student->classroom?->campus?->name ?? $student->classroom?->name ?? $student->tenant?->name;

        $mappedStudents = [];
        foreach ($allSiblings as $item) {
            if (is_array($item)) {
                $mappedStudents[] = [
                    'id' => $item['id'] ?? 0,
                    'name' => $item['name'] ?? '',
                    'student_name' => $item['student_name'] ?? ($item['name'] ?? ''),
                    'school_no' => $item['school_no'] ?? null,
                    'tc_no' => $item['tc_no'] ?? null,
                    'classroom' => $item['classroom'] ?? null,
                    'classroom_name' => $item['classroom_name'] ?? (is_array($item['classroom'] ?? null) ? ($item['classroom']['name'] ?? null) : null),
                    'phone' => $item['phone'] ?? null,
                ];
            }
        }

        return [
            'id' => $student->id,
            'name' => $student->name,
            'student_name' => $student->name,
            'email' => $student->email ?? ($guardian?->email ?? ''),
            'phone' => $student->phone ?? ($guardian?->phone ?? ''),
            'role_name' => 'Öğrenci',
            'role' => 'student',
            'campus_name' => $campusName,
            'guardian' => $guardian ? [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone' => $guardian->phone,
                'email' => $guardian->email,
            ] : null,
            'created_at' => $student->created_at?->toIso8601String(),
            'students' => $mappedStudents,
        ];
    }

    private function getGuardianActorProfile(Guardian $guardian): array
    {
        $guardianStudentIds = \DB::table('guardian_student')
            ->where('guardian_id', $guardian->id)
            ->pluck('student_id');

        $siblingStudentIds = \DB::table('student_siblings')
            ->whereIn('student_id', $guardianStudentIds)
            ->pluck('sibling_id')
            ->concat(\DB::table('student_siblings')->whereIn('sibling_id', $guardianStudentIds)->pluck('student_id'));

        $allStudentIds = $guardianStudentIds->concat($siblingStudentIds)->unique()->filter()->values()->all();

        $students = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('id', $allStudentIds)
            ->with(['classroom.campus', 'classroom.branch', 'tenant'])
            ->get();

        $primaryStudent = $students->first();
        $primaryClassroom = $primaryStudent?->classroom;
        $campusName = $primaryClassroom?->campus?->name ?? $guardian->tenant?->name;

        $mappedStudents = [];
        foreach ($students as $s) {
            $mappedStudents[] = [
                'id' => $s->id,
                'name' => $s->name,
                'student_name' => $s->name,
                'school_no' => $s->school_no,
                'tc_no' => $s->tc_no,
                'classroom' => $s->classroom ? [
                    'id' => $s->classroom->id,
                    'name' => $s->classroom->name,
                ] : null,
                'classroom_name' => $s->classroom?->name,
                'phone' => $s->phone,
            ];
        }

        return [
            'id' => $guardian->id,
            'name' => $guardian->name ?? 'Veli',
            'student_name' => $primaryStudent?->name,
            'email' => $guardian->email ?? '',
            'phone' => $guardian->phone ?? '',
            'role_name' => 'Veli',
            'role' => 'guardian',
            'campus_name' => $campusName,
            'guardian' => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'phone' => $guardian->phone,
                'email' => $guardian->email,
            ],
            'created_at' => $guardian->created_at?->toIso8601String(),
            'students' => $mappedStudents,
        ];
    }

    /**
     * Get calendar events for guardian (student-related events).
     */
    public function getCalendar(Request $request): JsonResponse
    {
        $guardian = $request->user();
        $students = $guardian->students()->pluck('id');
        
        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        // Guardian'ın öğrencileriyle ilgili etkinlikler
        $events = \App\Models\CalendarEvent::where(function ($q) use ($guardian, $students) {
            // Guardian katılımcı olarak eklenmiş
            $q->whereHas('participants', function ($pq) use ($guardian) {
                $pq->where('guardian_id', $guardian->id);
            })
            // Veya öğrencilerinden biri katılımcı
            ->orWhereHas('participants', function ($pq) use ($students) {
                $pq->whereIn('student_id', $students);
            })
            // Veya hedef kitleye guardian/students dahil
            ->orWhere(function ($sq) use ($guardian, $students) {
                $sq->where('is_public', true)
                    ->where(function ($tq) {
                        $tq->whereJsonContains('target_audience', [['type' => 'all']])
                            ->orWhereJsonContains('target_audience', [['type' => 'guardians']])
                            ->orWhereJsonContains('target_audience', [['type' => 'students']]);
                    });
            });
        })
            ->whereBetween('event_date', [$startDate, $endDate])
            ->with(['creator', 'participants'])
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();

        return $this->success([
            'events' => $events->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'description' => $event->description,
                    'event_type' => $event->event_type,
                    'event_date' => $event->event_date?->format('Y-m-d'),
                    'start_time' => $event->start_time,
                    'end_time' => $event->end_time,
                    'location' => $event->location,
                    'is_all_day' => $event->is_all_day,
                    'is_public' => $event->is_public,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Ajanda başarıyla getirildi.');
    }

    /**
     * Get student tutoring sessions.
     */
    public function getStudentTutoringSessions(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $sessions = \App\Models\TutoringSession::whereHas('students', function ($q) use ($student) {
            $q->where('students.id', $student->id);
        })
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['lesson', 'teacher', 'students'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        return $this->success([
            'sessions' => $sessions->map(function ($session) use ($student) {
                $attendance = \App\Models\TutoringSessionAttendance::where('tutoring_session_id', $session->id)
                    ->where('student_id', $student->id)
                    ->first();
                return [
                    'id' => $session->id,
                    'title' => $session->title,
                    'type' => $session->type,
                    'date' => $session->date?->format('Y-m-d'),
                    'start_time' => $session->start_time?->format('H:i'),
                    'end_time' => $session->end_time?->format('H:i'),
                    'room' => $session->room,
                    'remote_link' => $session->remote_link,
                    'lesson' => $session->lesson ? [
                        'id' => $session->lesson->id,
                        'name' => $session->lesson->name,
                    ] : null,
                    'teacher' => $session->teacher ? [
                        'id' => $session->teacher->id,
                        'name' => $session->teacher->name,
                    ] : null,
                    'attendance' => $attendance ? [
                        'status' => $attendance->status,
                        'notes' => $attendance->notes,
                    ] : null,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Etüt bilgileri başarıyla getirildi.');
    }

    /**
     * Get student online exams.
     */
    public function getStudentOnlineExams(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $query = OnlineExam::where(function ($q) use ($student) {
            $q->where('classroom_id', $student->classroom_id)
                ->orWhereNull('classroom_id');
        })
            ->where('status', 'active')
            ->with(['lesson']);

        $exams = $query->orderBy('start_time', 'desc')->get();

        return $this->success([
            'exams' => $exams->map(function (OnlineExam $exam) use ($student) {
                $attempt = $exam->attempts()->where('student_id', $student->id)->latest()->first();
                return [
                    'id' => $exam->id,
                    'title' => $exam->title,
                    'description' => $exam->description,
                    'start_time' => $exam->start_time?->format('Y-m-d H:i'),
                    'end_time' => $exam->end_time?->format('Y-m-d H:i'),
                    'duration_minutes' => $exam->duration_minutes,
                    'total_points' => $exam->total_points,
                    'lesson' => $exam->lesson ? [
                        'id' => $exam->lesson->id,
                        'name' => $exam->lesson->name,
                    ] : null,
                    'attempt' => $attempt ? [
                        'id' => $attempt->id,
                        'status' => $attempt->status,
                        'score' => $attempt->score,
                        'percentage' => $attempt->percentage,
                        'submitted_at' => $attempt->submitted_at?->format('Y-m-d H:i'),
                    ] : null,
                    'can_take' => $exam->canStudentTakeExam($student->id),
                ];
            }),
        ], 'Online sınavlar başarıyla getirildi.');
    }

    /**
     * Get student appointments.
     */
    public function getStudentAppointments(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        // Öğrenciyle ilgili randevular (lead üzerinden veya direkt)
        $appointments = \App\Models\Appointment::whereHas('lead', function ($q) use ($student) {
            $q->where('student_id', $student->id);
        })
            ->orWhere(function ($q) use ($student) {
                // Öğrenci adına randevu (gelecekte student_id field'ı eklenebilir)
            })
            ->whereBetween('appointment_date', [$startDate, $endDate])
            ->with(['lead', 'assignedUser'])
            ->orderBy('appointment_date')
            ->get();

        return $this->success([
            'appointments' => $appointments->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'name' => $appointment->name,
                    'phone' => $appointment->phone,
                    'appointment_date' => $appointment->appointment_date?->format('Y-m-d H:i'),
                    'status' => $appointment->status,
                    'notes' => $appointment->notes,
                    'assigned_to' => $appointment->assignedUser ? [
                        'id' => $appointment->assignedUser->id,
                        'name' => $appointment->assignedUser->name,
                    ] : null,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Randevular başarıyla getirildi.');
    }

    /**
     * Get student guidance notes.
     */
    public function getStudentGuidanceNotes(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Sadece veliye görünür olan notlar
        $notes = \App\Models\GuidanceNote::where('student_id', $student->id)
            ->where('is_visible_to_guardian', true)
            ->where('is_confidential', false)
            ->where('is_admin_approved', true)
            ->with(['counselor'])
            ->orderBy('note_date', 'desc')
            ->orderBy('note_time', 'desc')
            ->get();

        return $this->success([
            'notes' => $notes->map(function ($note) {
                return [
                    'id' => $note->id,
                    'title' => $note->title,
                    'content' => $note->content,
                    'type' => $note->type,
                    'note_date' => $note->note_date?->format('Y-m-d'),
                    'note_time' => $note->note_time,
                    'counselor' => $note->counselor ? [
                        'id' => $note->counselor->id,
                        'name' => $note->counselor->name,
                    ] : null,
                ];
            }),
        ], 'Rehberlik notları başarıyla getirildi.');
    }

    /**
     * Get student meal menus.
     */
    public function getStudentMealMenus(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date')
            ?? $request->input('menu_date_from')
            ?? now()->startOfWeek()->format('Y-m-d');
        $endDate = $request->input('end_date')
            ?? $request->input('menu_date_to')
            ?? now()->endOfWeek()->format('Y-m-d');

        $menus = \App\Models\MealMenu::where('is_published', true)
            ->where(function ($q) use ($student) {
                $q->where('classroom_id', $student->classroom_id)
                    ->orWhereJsonContains('target_student_ids', $student->id)
                    ->orWhereNull('classroom_id');
            })
            ->whereBetween('menu_date', [$startDate, $endDate])
            ->orderBy('menu_date')
            ->orderBy('meal_type')
            ->get();

        return $this->success([
            'menus' => $menus->map(function ($menu) {
                return [
                    'id' => $menu->id,
                    'menu_date' => $menu->menu_date?->format('Y-m-d'),
                    'meal_type' => $menu->meal_type,
                    'meals' => $menu->meals,
                    'notes' => $menu->notes,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Yemek menüleri başarıyla getirildi.');
    }

    /**
     * Get student bulletins and achievement certificates.
     */
    public function getStudentBulletins(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $bulletins = \App\Models\Bulletin::where('student_id', $student->id)
            ->where('is_published_to_guardian', true)
            ->with(['template', 'creator'])
            ->orderBy('bulletin_date', 'desc')
            ->get();

        $certificates = \App\Models\AchievementCertificate::where('student_id', $student->id)
            ->with(['template', 'creator'])
            ->orderBy('certificate_date', 'desc')
            ->get();

        return $this->success([
            'bulletins' => $bulletins->map(function ($bulletin) {
                return [
                    'id' => $bulletin->id,
                    'title' => $bulletin->title,
                    'content' => $bulletin->content,
                    'bulletin_date' => $bulletin->bulletin_date?->format('Y-m-d'),
                    'photo_ids' => $bulletin->photo_ids,
                    'teacher_comments' => $bulletin->teacher_comments,
                    'achievements' => $bulletin->achievements,
                ];
            }),
            'certificates' => $certificates->map(function ($certificate) {
                return [
                    'id' => $certificate->id,
                    'title' => $certificate->title,
                    'description' => $certificate->description,
                    'certificate_date' => $certificate->achievement_date?->format('Y-m-d'),
                    'achievement_type' => $certificate->achievement_type,
                    'photo_ids' => $certificate->photo_ids,
                ];
            }),
        ], 'Bültenler ve başarı belgeleri başarıyla getirildi.');
    }

    /**
     * Get student activities.
     */
    public function getStudentActivities(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $activities = \App\Models\Activity::where('is_published', true)
            ->where('is_admin_approved', true)
            ->where(function ($q) use ($student) {
                $q->where('share_type', 'all')
                    ->orWhere(function ($sq) use ($student) {
                        $sq->where('share_type', 'single_student')
                            ->whereJsonContains('target_student_ids', $student->id);
                    })
                    ->orWhere(function ($sq) use ($student) {
                        $sq->where('share_type', 'target_group')
                            ->where('classroom_id', $student->classroom_id);
                    });
            })
            ->with(['creator'])
            ->orderBy('activity_date', 'desc')
            ->orderBy('activity_time', 'desc')
            ->get();

        return $this->success([
            'activities' => $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'title' => $activity->title,
                    'description' => $activity->description,
                    'category' => $activity->category,
                    'activity_date' => $activity->activity_date?->format('Y-m-d'),
                    'activity_time' => $activity->activity_time,
                    'location' => $activity->location,
                    'photo_file_ids' => $activity->photo_file_ids,
                    'video_file_ids' => $activity->video_file_ids,
                    'view_count' => $activity->view_count,
                    'like_count' => $activity->like_count,
                ];
            }),
        ], 'Sosyal etkinlikler başarıyla getirildi.');
    }

    /**
     * Get student surveys (Form and Online).
     */
    public function getStudentSurveys(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Form Anketler (hedef kitleye öğrenci dahil)
        $formSurveys = FormSurvey::where('is_active', true)
            ->where(function ($q) use ($student) {
                $q->whereJsonContains('target_audience', [['type' => 'all']])
                    ->orWhereJsonContains('target_audience', [['type' => 'students']])
                    ->orWhereJsonContains('target_audience', [['type' => 'specific', 'ids' => [$student->id]]]);
            })
            ->where(function ($q) {
                $q->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->with(['creator'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Online Anketler (hedef kitleye öğrenci dahil)
        $onlineSurveys = OnlineSurvey::where('is_active', true)
            ->where(function ($q) use ($student) {
                $q->whereJsonContains('target_audience', [['type' => 'all']])
                    ->orWhereJsonContains('target_audience', [['type' => 'students']])
                    ->orWhereJsonContains('target_audience', [['type' => 'specific', 'ids' => [$student->id]]]);
            })
            ->where(function ($q) {
                $q->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            })
            ->with(['creator', 'questions'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success([
            'form_surveys' => $formSurveys->map(function (FormSurvey $survey) use ($student) {
                // FormSurveyResponse'da respondent_id ve respondent_type kontrolü
                $response = $survey->responses()
                    ->where(function ($q) use ($student) {
                        $q->where('respondent_id', $student->id)
                            ->where('respondent_type', 'student');
                    })
                    ->first();
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'survey_type' => $survey->survey_type,
                    'start_date' => $survey->start_date ? Carbon::parse($survey->start_date)->format('Y-m-d') : null,
                    'end_date' => $survey->end_date ? Carbon::parse($survey->end_date)->format('Y-m-d') : null,
                    'is_required' => false, // Form anketlerde is_required yok
                    'has_responded' => $response !== null,
                    'response_id' => $response?->id,
                ];
            }),
            'online_surveys' => $onlineSurveys->map(function (OnlineSurvey $survey) use ($student) {
                // OnlineSurveyResponse'da respondent_id ve respondent_type kontrolü
                $response = $survey->responses()
                    ->where(function ($q) use ($student) {
                        $q->where('respondent_id', $student->id)
                            ->where('respondent_type', 'student');
                    })
                    ->first();
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'start_date' => $survey->start_date ? Carbon::parse($survey->start_date)->format('Y-m-d') : null,
                    'end_date' => $survey->end_date ? Carbon::parse($survey->end_date)->format('Y-m-d') : null,
                    'is_required' => $survey->is_required,
                    'question_count' => $survey->question_count,
                    'has_responded' => $response !== null,
                    'response_id' => $response?->id,
                ];
            }),
        ], 'Anketler başarıyla getirildi.');
    }

    /**
     * Get student questions (Sorum Var).
     */
    public function getStudentQuestions(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $questions = \App\Models\Question::where('student_id', $student->id)
            ->orWhere(function ($q) use ($guardian) {
                $q->where('guardian_id', $guardian->id);
            })
            ->with(['assignedUser', 'respondedBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success([
            'questions' => $questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'subject' => $question->subject,
                    'message' => $question->message,
                    'status' => $question->status,
                    'response' => $question->response,
                    'responded_at' => $question->responded_at?->format('Y-m-d H:i'),
                    'assigned_to' => $question->assignedUser ? [
                        'id' => $question->assignedUser->id,
                        'name' => $question->assignedUser->name,
                    ] : null,
                    'responded_by' => $question->respondedBy ? [
                        'id' => $question->respondedBy->id,
                        'name' => $question->respondedBy->name,
                    ] : null,
                ];
            }),
        ], 'Sorular başarıyla getirildi.');
    }

    /**
     * Get student meal attendance.
     */
    public function getStudentMealAttendance(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $attendances = \App\Models\MealAttendance::where('student_id', $student->id)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->with(['mealMenu'])
            ->orderBy('attendance_date', 'desc')
            ->orderBy('meal_type')
            ->get();

        return $this->success([
            'attendances' => $attendances->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'attendance_date' => $attendance->attendance_date?->format('Y-m-d'),
                    'meal_type' => $attendance->meal_type,
                    'status' => $attendance->status,
                    'notes' => $attendance->notes,
                    'menu' => $attendance->mealMenu ? [
                        'id' => $attendance->mealMenu->id,
                        'meals' => $attendance->mealMenu->meals,
                    ] : null,
                ];
            }),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Yemek yoklama bilgileri başarıyla getirildi.');
    }

    /**
     * Get student notifications and SMS.
     */
    public function getStudentNotifications(Request $request, Student $student): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        // Laravel notifications (bildirimler)
        $notifications = $student->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // SMS raporları (guardian'ın telefonuna gönderilen SMS'ler)
        $smsReports = \App\Models\SmsReport::where('phone', $guardian->phone)
            ->orderBy('sent_at', 'desc')
            ->paginate(20);

        return $this->success([
            'notifications' => [
                'data' => $notifications->map(function ($notification) {
                    $data = $notification->data;
                    return [
                        'id' => $notification->id,
                        'title' => $data['title'] ?? null,
                        'message' => $data['message'] ?? null,
                        'type' => $data['type'] ?? 'info',
                        'read_at' => $notification->read_at?->format('Y-m-d H:i'),
                        'created_at' => $notification->created_at?->format('Y-m-d H:i'),
                    ];
                }),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ],
            ],
            'sms_reports' => [
                'data' => $smsReports->map(function ($sms) {
                    return [
                        'id' => $sms->id,
                        'message' => $sms->message,
                        'phone' => $sms->phone,
                        'status' => $sms->status,
                        'sent_at' => $sms->sent_at?->format('Y-m-d H:i'),
                        'error_message' => $sms->error_message,
                    ];
                }),
                'pagination' => [
                    'current_page' => $smsReports->currentPage(),
                    'last_page' => $smsReports->lastPage(),
                    'per_page' => $smsReports->perPage(),
                    'total' => $smsReports->total(),
                ],
            ],
        ], 'Bildirimler ve SMS raporları başarıyla getirildi.');
    }

    /**
     * Mark notification as read.
     */
    public function markNotificationAsRead(Request $request, Student $student, string $notificationId): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        $notification = $student->notifications()->where('id', $notificationId)->first();

        if (!$notification) {
            return $this->error('Bildirim bulunamadı.', [], 404);
        }

        $notification->markAsRead();

        return $this->success(null, 'Bildirim okundu olarak işaretlendi.');
    }

    /**
     * Select project homework topic for student.
     */
    public function selectProjectTopic(Request $request, Student $student, \App\Models\Homework $homework): JsonResponse
    {
        $guardian = $request->user();

        if (!$guardian->students()->where('students.id', $student->id)->exists()) {
            return $this->error('Bu öğrenciye erişim yetkiniz yok.', [], 403);
        }

        if (!$homework->is_project) {
            return $this->error('Bu ödev bir proje ödevi değil.', [], 400);
        }

        if (!$homework->project_topics || empty($homework->project_topics)) {
            return $this->error('Bu ödev için proje konuları tanımlanmamış.', [], 400);
        }

        $request->validate([
            'selected_topic' => ['required', 'string'],
        ]);

        $selectedTopic = $request->input('selected_topic');

        // Seçilen konu, ödevdeki konular arasında var mı kontrol et
        if (!in_array($selectedTopic, $homework->project_topics)) {
            return $this->error('Seçilen konu geçersiz.', [], 400);
        }

        // Submission oluştur veya güncelle
        $submission = \App\Models\HomeworkSubmission::firstOrNew([
            'homework_id' => $homework->id,
            'student_id' => $student->id,
        ]);

        $submission->selected_topic = $selectedTopic;
        $submission->status = 'topic_selected';
        $submission->save();

        return $this->success([
            'submission' => [
                'id' => $submission->id,
                'selected_topic' => $selectedTopic,
                'project_topic_id' => $submission->project_topic_id,
                'status' => $submission->status,
            ],
        ], 'Proje konusu başarıyla seçildi.');
    }
}
