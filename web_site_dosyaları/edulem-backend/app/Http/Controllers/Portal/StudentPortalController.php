<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\ApiController;
use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StudentPortalController extends ApiController
{
    /**
     * Student portal login.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'tc_no' => 'required|string',
            'password' => 'required|string',
            'device_name' => 'sometimes|string|max:255',
        ]);

        $tcNo = preg_replace('/\D/', '', (string) $request->tc_no);
        if (!$tcNo) {
            return $this->error('TC Kimlik No gereklidir.', [], 422);
        }
        // Not: Eski mobil uygulama versiyonlarında TC alanında karakter sınırı
        // yoktu. Geriye dönük uyumluluk için 11 hane zorunluluğu kaldırıldı.

        $candidates = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tc_no', $tcNo)
            ->with([
                'guardians' => function ($q) {
                    $q->orderBy('guardian_student.created_at')->orderBy('guardians.id');
                },
                'season'
            ])
            ->get();

        // Eğer TC numarası personel (users) tablosundaysa veya öğrenci kaydı yoksa,
        // eski mobil uygulamanın 401 interceptor döngüsüne takılmadan doğrudan Step 2'ye (/auth/login)
        // geçebilmesi için 404 dönüyoruz.
        $isStaff = \App\Models\User::where('tc_no', $tcNo)->exists();
        if ($isStaff || $candidates->isEmpty()) {
            return $this->error('Öğrenci kaydı bulunamadı.', [], 404);
        }

        // Sadece AKTİF sezondaki öğrenci kayıtlarını filtrele
        $activeCandidates = $candidates->filter(function ($cand) {
            return $cand->season && $cand->season->is_active;
        });

        if ($activeCandidates->isEmpty()) {
            return $this->error('Giriş bilgileri hatalı veya sezon aktif değil.', [], 401);
        }

        // Sadece şifresi eşleşen öğrencileri filtrele
        $validCandidates = $activeCandidates->filter(function ($cand) use ($request) {
            return !empty($cand->password) && Hash::check($request->password, $cand->password);
        });

        if ($validCandidates->isEmpty()) {
            return $this->error('Giriş bilgileri hatalı.', [], 401);
        }

        // Geçerli adaylar arasından AKTİF SEZONDA olanı öncelikli seç
        $student = $validCandidates->first(function ($cand) {
            if (!$cand->season_id)
                return false;
            return \App\Models\Season::where('id', $cand->season_id)
                ->where('is_active', true)
                ->exists();
        });

        // Eğer aktif sezon kaydı bulunamadıysa en güncel sezon/kayıt olanı seç
        if (!$student) {
            $student = $validCandidates->sortByDesc('season_id')->sortByDesc('id')->first();
        }

        if (isset($student->is_portal_active) && !$student->is_portal_active) {
            return $this->error('Öğrenci portal erişimi aktif değil.', [], 403);
        }

        $token = $student->createToken($request->device_name ?? 'portal-token')->plainTextToken;

        // Son giriş tarihini güncelle
        if (\Illuminate\Support\Facades\Schema::hasColumn('students', 'last_login_at')) {
            $student->update(['last_login_at' => now()]);
        }

        return $this->success([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'student_name' => $student->name,
                'school_no' => $student->school_no,
                'email' => $student->email,
                'role' => 'student',
                'role_name' => 'Öğrenci',
                'is_student' => true,
                'classroom_name' => $student->classroom?->name,
                'season_id' => $student->season_id,
            ],
            'token' => $token,
        ], 'Giriş başarılı.');
    }

    private function resolvePortalStudent(Request $request): ?Student
    {
        $actor = $request->user();

        if ($actor instanceof Student) {
            // Eğer istekte belirli bir öğrenci (kardeş) ID'si belirtilmişse ve bu aktörden farklıysa:
            $requestedStudentId = (int) ($request->input('student_id') ?? $request->header('X-Student-Id') ?? 0);
            if ($requestedStudentId > 0 && $requestedStudentId !== (int) $actor->id) {
                // Kardeş veya aynı veliye bağlı olup olmadığını doğrula
                $isSibling = \DB::table('student_siblings')
                    ->where(function ($q) use ($actor, $requestedStudentId) {
                        $q->where('student_id', $actor->id)->where('sibling_id', $requestedStudentId);
                    })
                    ->orWhere(function ($q) use ($actor, $requestedStudentId) {
                        $q->where('student_id', $requestedStudentId)->where('sibling_id', $actor->id);
                    })
                    ->exists();

                if (!$isSibling && !empty($actor->sibling_ids)) {
                    $raw = (array) $actor->sibling_ids;
                    if (in_array($requestedStudentId, array_map('intval', $raw))) {
                        $isSibling = true;
                    }
                }

                if ($isSibling) {
                    $targetStudent = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                        ->with(['classroom', 'season'])
                        ->find($requestedStudentId);

                    if ($targetStudent) {
                        return $targetStudent;
                    }
                }
            }

            // Eğer öğrencinin bağlı olduğu sezon aktif sezon değilse,
            // aynı tc_no/school_no ve tenant_id'ye sahip AKTİF SEZONDAKİ kaydını bul ve kullan.
            $activeSeasonId = \App\Models\Season::where('tenant_id', $actor->tenant_id)
                ->where('is_active', true)
                ->value('id');

            if ($activeSeasonId && (int) $actor->season_id !== (int) $activeSeasonId) {
                $activeStudent = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tenant_id', $actor->tenant_id)
                    ->where('season_id', $activeSeasonId)
                    ->where(function ($q) use ($actor) {
                        if (!empty($actor->tc_no)) {
                            $q->where('tc_no', $actor->tc_no);
                        }
                        if (!empty($actor->school_no)) {
                            $q->orWhere('school_no', $actor->school_no);
                        }
                        $q->orWhere('name', $actor->name);
                    })
                    ->first();

                if ($activeStudent) {
                    return $activeStudent;
                }
            }

            return $actor;
        }

        return null;
    }

    private function resolvePortalGuardian(Request $request): ?Guardian
    {
        $actor = $request->user();

        if ($actor instanceof Guardian) {
            return $actor;
        }

        if ($actor instanceof Student) {
            return $actor->guardians()
                ->orderBy('guardian_student.created_at')
                ->orderBy('guardians.id')
                ->first();
        }

        return null;
    }

    /**
     * Öğrencinin ve velisinin tüm kardeşlerini ve diğer kayıtlı çocukları bulur.
     */
    public function getPortalSiblings(Student $student, ?Guardian $guardian = null): \Illuminate\Support\Collection
    {
        $siblingIds = collect();

        // 1. student_siblings tablosu (çift yönlü/simetrik kontrol)
        $fromPivot1 = \DB::table('student_siblings')->where('student_id', $student->id)->pluck('sibling_id');
        $fromPivot2 = \DB::table('student_siblings')->where('sibling_id', $student->id)->pluck('student_id');
        $siblingIds = $siblingIds->concat($fromPivot1)->concat($fromPivot2);

        // 2. students.sibling_ids JSON sütunu
        if (!empty($student->sibling_ids)) {
            $rawSiblingIds = (array) $student->sibling_ids;
            $siblingIds = $siblingIds->concat($rawSiblingIds);
        }

        // Otomatik veli eşleştirmesi kaldırıldı: Yalnızca personelin seçtiği resmi kayıtlar (student_siblings / sibling_ids) geçerlidir.

        // 3. Mevcut öğrenciyi hariç tut, temizle
        $cleanIds = $siblingIds->map(fn($id) => (int) $id)
            ->filter(fn($id) => $id > 0 && $id !== (int) $student->id)
            ->unique()
            ->values();

        if ($cleanIds->isEmpty()) {
            return collect();
        }

        $activeSeasonId = \App\Models\Season::where('tenant_id', $student->tenant_id)
            ->where('is_active', true)
            ->value('id');

        $rawSiblings = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->whereIn('id', $cleanIds)
            ->with(['classroom.campus', 'classroom.branch', 'season'])
            ->get();

        return $this->filterUniqueSiblings($rawSiblings, $student, $activeSeasonId ? (int) $activeSeasonId : null);
    }

    /**
     * Kardeş kayıtlarını filtreler ve aktif sezona göre tekilleştirir.
     */
    private function filterUniqueSiblings(\Illuminate\Support\Collection $rawSiblings, Student $student, ?int $activeSeasonId): \Illuminate\Support\Collection
    {
        $currentStudentNameClean = trim(mb_strtolower($student->name));
        $currentStudentTcClean = !empty($student->tc_no) ? trim($student->tc_no) : null;

        // Mevcut öğrencinin kendi kayıtlarını ele
        $filtered = $rawSiblings->filter(function ($s) use ($student, $currentStudentNameClean, $currentStudentTcClean) {
            if ((int) $s->id === (int) $student->id) {
                return false;
            }
            if ($currentStudentTcClean && !empty($s->tc_no) && trim($s->tc_no) === $currentStudentTcClean) {
                return false;
            }
            if (trim(mb_strtolower($s->name)) === $currentStudentNameClean) {
                return false;
            }
            return true;
        });

        // Aynı öğrencinin farklı sezon kayıtlarını grupla ve aktif sezonu seç
        $grouped = $filtered->groupBy(function ($s) {
            $tc = !empty($s->tc_no) ? trim($s->tc_no) : null;
            return $tc ? ('tc_' . $tc) : ('name_' . trim(mb_strtolower($s->name)));
        });

        return $grouped->map(function ($group) use ($activeSeasonId) {
            if ($group->count() === 1) {
                return $group->first();
            }

            if ($activeSeasonId) {
                $activeRecord = $group->first(fn($s) => (int) $s->season_id === $activeSeasonId);
                if ($activeRecord) {
                    return $activeRecord;
                }
            }

            return $group->sortByDesc('id')->first();
        })->map(function ($s) {
            return [
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
            ];
        })->values();
    }

    /**
     * Format today's schedule items for portal dashboard.
     */
    private function formatTodayScheduleItems($todaySchedule): array
    {
        return $todaySchedule->map(function ($schedule) {
            $startTime = $schedule->start_time instanceof \DateTimeInterface
                ? $schedule->start_time->format('H:i')
                : (is_string($schedule->start_time) ? substr($schedule->start_time, 0, 5) : $schedule->start_time);
            $endTime = $schedule->end_time instanceof \DateTimeInterface
                ? $schedule->end_time->format('H:i')
                : (is_string($schedule->end_time) ? substr($schedule->end_time, 0, 5) : $schedule->end_time);

            return [
                'id' => $schedule->id,
                'day_of_week' => $schedule->day_of_week,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'lesson' => $schedule->lesson ? [
                    'id' => $schedule->lesson->id,
                    'name' => $schedule->lesson->name,
                ] : null,
                'teacher' => $schedule->teacher ? [
                    'id' => $schedule->teacher->id,
                    'name' => $schedule->teacher->name,
                ] : null,
            ];
        })->values()->toArray();
    }

    /**
     * Format announcements for portal dashboard.
     */
    private function formatDashboardAnnouncements($announcements): array
    {
        return $announcements->map(function ($announcement) {
            return [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'message' => $announcement->message,
                'type' => $announcement->type,
                'created_at' => $announcement->created_at?->toIso8601String(),
            ];
        })->values()->toArray();
    }

    /**
     * Format today's menu for portal dashboard.
     */
    private function formatTodayMenu($todayMenu): ?array
    {
        if (!$todayMenu) {
            return null;
        }

        $formattedDate = $todayMenu->menu_date
            ? \Carbon\Carbon::parse($todayMenu->menu_date)->format('Y-m-d')
            : null;

        return [
            'id' => $todayMenu->id,
            'menu_date' => $formattedDate,
            'meal_type' => $todayMenu->meal_type,
            'meals' => $todayMenu->meals,
            'notes' => $todayMenu->notes,
        ];
    }

    /**
     * Format student basic info for portal dashboard.
     */
    private function formatStudentInfo($student): array
    {
        $classroom = $student->classroom;
        return [
            'id' => $student->id,
            'name' => $student->name,
            'school_no' => $student->school_no,
            'classroom' => $classroom ? [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'campus_id' => $classroom->campus_id,
                'campus_name' => $classroom->campus?->name ?? null,
                'education_level' => $classroom->educationLevel?->name ?? null,
                'grade_level' => $classroom->grade_level,
            ] : null,
        ];
    }

    /**
     * Get student dashboard data.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }
        $student->load([
            'classroom' => function ($q) {
                // SeasonScope bypass: sınıf hangi döneme ait olursa olsun yükle
                $q->withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->with(['campus', 'educationLevel']);
            },
            'city',
            'district',
        ]);

        $todaySchedule = $this->getDashboardTodaySchedule($student);
        [$upcomingHomeworks, $pendingHomeworkCount, $completedHomeworkCount] = $this->getDashboardHomeworkData($student->id);
        $announcements = $this->getDashboardAnnouncementsData($student, $request->user());
        $todayMenus = $this->getDashboardTodayMenus($student);

        $guardian = $this->resolvePortalGuardian($request);
        $mappedSiblings = $this->getPortalSiblings($student, $guardian);
        $currentStudentInfo = $this->formatStudentInfo($student);
        $allStudents = collect([$currentStudentInfo])->concat($mappedSiblings)->values();

        $responseData = [
            'student' => $currentStudentInfo,
            'siblings' => $mappedSiblings,
            'students' => $allStudents,
            'summary' => [
                'pending_homework_count' => max(0, $pendingHomeworkCount),
                'completed_homework_count' => $completedHomeworkCount,
            ],
            'today_schedule' => $this->formatTodayScheduleItems($todaySchedule),
            'upcoming_homeworks' => $upcomingHomeworks,
            'today_menu' => $todayMenus->first() ? $this->formatTodayMenu($todayMenus->first()) : null,
            'today_menus' => $todayMenus->map(fn($m) => $this->formatTodayMenu($m))->filter()->values()->all(),
            'announcements' => $this->formatDashboardAnnouncements($announcements),
        ];

        return $this->success($responseData, 'Dashboard verileri başarıyla getirildi.');
    }

    private function getDashboardHomeworkData(int $studentId): array
    {
        $assignments = \App\Models\HomeworkStudentAssignment::query()
            ->where('student_id', $studentId)
            ->with([
                'homework' => function ($q) {
                    $q->select(['id', 'title', 'due_date', 'lesson_id', 'is_active'])
                        ->with('lesson:id,name')
                        ->where('is_active', true);
                }
            ])
            ->get()
            ->filter(fn($assignment) => $assignment->homework !== null)
            ->values();

        // Yaklaşan ödevler: Henüz öğretmence kontrol edilmemiş ve teslim süresi devam edenler
        $upcoming = \App\Models\Homework::whereHas('assignments', function ($q) use ($studentId) {
            $q->where('student_id', $studentId)
              ->where(function ($rq) {
                  $rq->whereNull('review_status')->orWhere('review_status', '');
              });
        })
            ->where('is_active', true)
            ->where('due_date', '>=', now()->startOfDay())
            ->with(['lesson'])
            ->orderBy('due_date')
            ->take(5)
            ->get();

        // Kontrolü yapılan (durum girilen) tüm ödevler öğrenci için tamamlandı sayılır
        $completedCount = $assignments->filter(fn($a) => !empty($a->review_status))->count();
        $pendingCount = max(0, $assignments->count() - $completedCount);

        return [$upcoming, $pendingCount, $completedCount];
    }

    private function getDashboardTodaySchedule($student)
    {
        $dayNameMap = [
            0 => 'sunday',
            1 => 'monday',
            2 => 'tuesday',
            3 => 'wednesday',
            4 => 'thursday',
            5 => 'friday',
            6 => 'saturday',
        ];
        $todayDayIndex = (int) now()->dayOfWeek;
        $todayDayName = $dayNameMap[$todayDayIndex] ?? null;

        return \App\Models\Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('classroom_id', $student->classroom_id)
            ->where(function ($q) use ($todayDayIndex, $todayDayName) {
                $q->where('day_of_week', $todayDayIndex);
                if ($todayDayName) {
                    $q->orWhere('day_of_week', $todayDayName);
                }
            })
            ->with([
                'lesson' => function ($ql) {
                    $ql->withoutGlobalScope(\App\Scopes\SeasonScope::class);
                },
                'teacher'
            ])
            ->orderBy('start_time')
            ->get();
    }

    private function getDashboardAnnouncementsData($student, $user)
    {
        if (!$user) {
            return collect();
        }

        return \App\Models\Announcement::query()
            ->leftJoin('announcement_reads as ar_u', function ($j) use ($user) {
                $j->on('announcements.id', '=', 'ar_u.announcement_id')->where('ar_u.user_id', '=', $user->id);
            })
            ->where('status', 'published')
            ->where('tenant_id', $student->tenant_id)
            ->where(function ($q) {
                $q->whereNull('target_roles')
                    ->orWhereJsonContains('target_roles', 'student')
                    ->orWhereJsonContains('target_roles', 'Öğrenci');
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

    private function getDashboardTodayMenus($student)
    {
        return \App\Models\MealMenu::query()
            ->where('tenant_id', $student->tenant_id)
            ->whereDate('menu_date', now()->toDateString())
            ->where('is_published', true)
            ->where(function ($q) use ($student) {
                $q->where('classroom_id', $student->classroom_id)
                    ->orWhereJsonContains('target_student_ids', $student->id)
                    ->orWhereNull('classroom_id');
            })
            ->orderBy('meal_type')
            ->get();
    }

    /**
     * Get student schedule.
     */
    public function getSchedule(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        // classroom_id alanı direkt kontrol ediliyor (relation değil), bu yüzden SeasonScope sorunu yok
        // Ama ilişkiyi yüklerken SeasonScope'u atlatıyoruz
        if (!$student->classroom_id) {
            return $this->error('Öğrenci bir sınıfa atanmamış.', [], 400);
        }

        $schedules = \App\Models\Schedule::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tenant_id', $student->tenant_id)
            ->where('classroom_id', $student->classroom_id)
            ->with(['lesson', 'teacher'])
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return $this->success([
            'schedules' => $schedules->map(function ($schedule) {
                return [
                    'id' => (int) $schedule->id,
                    'day_of_week' => $schedule->day_of_week,
                    'start_time' => $schedule->start_time instanceof \DateTimeInterface
                        ? $schedule->start_time->format('H:i')
                        : (is_string($schedule->start_time) ? substr($schedule->start_time, 0, 5) : $schedule->start_time),
                    'end_time' => $schedule->end_time instanceof \DateTimeInterface
                        ? $schedule->end_time->format('H:i')
                        : (is_string($schedule->end_time) ? substr($schedule->end_time, 0, 5) : $schedule->end_time),
                    'lesson' => $schedule->lesson ? [
                        'id' => (int) $schedule->lesson->id,
                        'name' => (string) $schedule->lesson->name,
                    ] : null,
                    'teacher' => $schedule->teacher ? [
                        'id' => (int) $schedule->teacher->id,
                        'name' => (string) $schedule->teacher->name,
                    ] : null,
                    'remote_link' => $schedule->remote_link,
                ];
            }),
        ], 'Ders programı başarıyla getirildi.');
    }

    /**
     * Get student homework.
     */
    public function getHomework(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $query = \App\Models\Homework::whereHas('assignments', function ($q) use ($student) {
            $q->where('student_id', $student->id);
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
                    'due_date' => $homework->due_date ? \Illuminate\Support\Carbon::parse($homework->due_date)->format('Y-m-d') : null,
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
     * Get single homework detail for student portal.
     */
    public function getHomeworkDetail(Request $request, $homeworkId): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $homework = \App\Models\Homework::where('id', $homeworkId)
            ->where(function ($q) use ($student) {
                $q->whereHas('assignments', fn ($aq) => $aq->where('student_id', $student->id));
                if ($student->classroom_id) {
                    $q->orWhere('classroom_id', $student->classroom_id);
                }
            })
            ->with([
                'lesson',
                'teacher',
                'file',
                'classroom',
                'assignments' => function ($q) use ($student) {
                    $q->where('student_id', $student->id);
                },
            ])
            ->first();

        if (!$homework) {
            return $this->error('Ödev bulunamadı veya erişim yetkiniz yok.', [], 404);
        }

        $submission = $homework->submissions()->where('student_id', $student->id)->first();
        $assignment = $homework->assignments->first();
        $isChecked = !empty($assignment?->review_status);
        $isOverdue = $homework->due_date && \Illuminate\Support\Carbon::parse($homework->due_date)->endOfDay()->isPast();

        $statusLabel = match ($assignment?->review_status) {
            'done' => 'Yapıldı',
            'completed' => 'Tamamlandı',
            'partial' => 'Eksik',
            'not_done' => 'Yapılmadı',
            'absent' => 'Gelmedi',
            'missing' => 'Gelmedi',
            default => 'Değerlendirilmedi',
        };

        $data = [
            'id' => $homework->id,
            'title' => $homework->title,
            'description' => $homework->description,
            'due_date' => $homework->due_date ? \Illuminate\Support\Carbon::parse($homework->due_date)->format('Y-m-d') : null,
            'created_at' => $homework->created_at?->format('Y-m-d H:i:s'),
            'is_online' => (bool) $homework->is_online,
            'is_project' => (bool) $homework->is_project,
            'project_topics' => $homework->project_topics,
            'is_checked' => $isChecked,
            'review_status' => $assignment?->review_status,
            'teacher_note' => $assignment?->teacher_note,
            'status_label' => $statusLabel,
            'status' => $isChecked ? ($assignment?->review_status ?? 'submitted') : ($isOverdue ? 'overdue' : 'pending'),
            'file' => $homework->file ? [
                'id' => $homework->file->id,
                'name' => $homework->file->original_name ?? $homework->file->name,
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
                'status_label' => $statusLabel,
                'teacher_note' => $assignment?->teacher_note,
                'reviewed_at' => $assignment?->reviewed_at?->format('Y-m-d H:i'),
            ],
        ];

        return $this->success(['homework' => $data], 'Ödev detayı getirildi.');
    }

    /**
     * Get student homework control report.
     */
    public function getHomeworkControlReport(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $homeworks = \App\Models\Homework::whereHas('assignments', function ($q) use ($student) {
            $q->where('student_id', $student->id);
        })
            ->whereBetween('due_date', [$startDate, $endDate])
            ->with([
                'lesson',
                'teacher',
                'submissions' => function ($q) use ($student) {
                    $q->where('student_id', $student->id);
                }
            ])
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
                    'due_date' => $homework->due_date ? \Illuminate\Support\Carbon::parse($homework->due_date)->format('Y-m-d') : null,
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
    public function getAttendance(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $attendances = \App\Models\Attendance::where('student_id', $student->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['schedule.lesson', 'teacher'])
            ->orderBy('date', 'desc')
            ->get();

        $groupedByDate = $attendances->groupBy(fn($attendance) => optional($attendance->date)->format('Y-m-d'));

        $attendanceByDay = $groupedByDate->map(function ($dayItems, $date) {
            $statuses = $dayItems->pluck('status')->filter()->values();

            $dayStatus = 'present';
            if ($statuses->contains('absent')) {
                $dayStatus = 'absent';
            } elseif ($statuses->contains('excused') || $statuses->contains('sick')) {
                $dayStatus = 'excused';
            }

            return [
                'date' => $date,
                'status' => $dayStatus,
                'status_label' => match ($dayStatus) {
                    'absent' => 'Gelmedi',
                    'excused' => 'İzinli/Raporlu',
                    default => 'Geldi',
                },
                'entries' => $dayItems->map(function ($attendance) {
                    return [
                        'id' => $attendance->id,
                        'status' => $attendance->status,
                        'lesson' => $attendance->schedule && $attendance->schedule->lesson ? [
                            'id' => $attendance->schedule->lesson->id,
                            'name' => $attendance->schedule->lesson->name,
                        ] : null,
                    ];
                })->values(),
            ];
        })->values();

        $cameDaysCount = $attendanceByDay->where('status', 'present')->count();
        $absentDaysCount = $attendanceByDay->where('status', 'absent')->count();
        $excusedDaysCount = $attendanceByDay->where('status', 'excused')->count();

        $problemDays = $attendanceByDay
            ->whereIn('status', ['absent', 'excused'])
            ->values();

        return $this->success([
            'summary' => [
                'came_days' => $cameDaysCount,
                'absent_days' => $absentDaysCount,
                'excused_or_reported_days' => $excusedDaysCount,
            ],
            'problem_days' => $problemDays,
            'attendances' => $attendanceByDay,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Devamsızlık bilgileri başarıyla getirildi.');
    }

    /**
     * Get student announcements.
     */
    public function getAnnouncements(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $user = $request->user();
        $mailbox = $request->get('mailbox', 'inbox');

        $query = \App\Models\Announcement::query()
            ->leftJoin('announcement_reads as ar_u', function ($j) use ($user) {
                $j->on('announcements.id', '=', 'ar_u.announcement_id')->where('ar_u.user_id', '=', $user->id);
            })
            ->where('announcements.tenant_id', $student->tenant_id)
            ->where('announcements.status', 'published')
            ->where(function ($q) {
                $q->whereNull('announcements.target_roles')
                    ->orWhereJsonContains('announcements.target_roles', 'student')
                    ->orWhereJsonContains('announcements.target_roles', 'Öğrenci');
            });

        // Always hide globally deleted records for this user
        $query->where(function ($q) {
            $q->whereNull('ar_u.is_deleted')->orWhere('ar_u.is_deleted', 0);
        });

        switch ($mailbox) {
            case 'trash':
                $query->where('ar_u.is_trashed', 1);
                break;
            case 'starred':
                $query->where('ar_u.is_starred', 1)
                    ->where(function ($sq) {
                        $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                break;
            case 'important':
                $query->where('ar_u.is_important', 1)
                    ->where(function ($sq) {
                        $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0); });
                break;
            default: // inbox
                $query->where(function ($sq) {
                    $sq->whereNull('ar_u.is_trashed')->orWhere('ar_u.is_trashed', 0);
                });
                break;
        }

        $announcements = $query->orderBy('announcements.created_at', 'desc')
            ->select('announcements.*', 'ar_u.read_at as user_read_at', 'ar_u.is_starred', 'ar_u.is_important', 'ar_u.is_trashed')
            ->paginate(20);

        return $this->success([
            'announcements' => $announcements->map(function ($a) {
                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'message' => $a->message,
                    'type' => $a->type,
                    'created_at' => $a->created_at?->toIso8601String(),
                    'read' => !empty($a->user_read_at),
                    'is_starred' => (bool) $a->is_starred,
                    'is_important' => (bool) $a->is_important,
                    'is_trashed' => (bool) $a->is_trashed,
                ];
            })->values(),
            'pagination' => [
                'current_page' => $announcements->currentPage(),
                'last_page' => $announcements->lastPage(),
                'per_page' => $announcements->perPage(),
                'total' => $announcements->total(),
            ],
            'counts' => [
                'inbox' => (int) \App\Models\Announcement::query()
                    ->where('status', 'published')
                    ->where('tenant_id', $student->tenant_id)
                    ->where(function ($q) {
                        $q->whereNull('target_roles')
                            ->orWhereJsonContains('target_roles', 'student')
                            ->orWhereJsonContains('target_roles', 'Öğrenci');
                    })
                    ->whereDoesntHave('reads', fn($q) => $q->where('user_id', $user->id)->where(fn($sq) => $sq->where('is_trashed', 1)->orWhere('is_deleted', 1)))
                    ->count(),
                'trash' => (int) \App\Models\AnnouncementRead::where('user_id', $user->id)->where('is_trashed', 1)->count(),
            ]
        ], 'Duyurular başarıyla getirildi.');
    }

    /**
     * Get student grades.
     */
    public function getGrades(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
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
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ], [
            'current_password.required' => 'Mevcut şifre alanı zorunludur.',
            'new_password.required' => 'Yeni şifre alanı zorunludur.',
            'new_password.min' => 'Yeni şifre en az 6 karakter olmalıdır.',
            'new_password.confirmed' => 'Yeni şifre tekrarı eşleşmiyor.',
        ]);

        $actor = $request->user();
        if (!$actor) {
            return $this->error('Kullanıcı bulunamadı.', [], 404);
        }

        $currentPassword = (string) $request->current_password;
        $newPassword = (string) $request->new_password;
        $hashedNewPassword = Hash::make($newPassword);

        $passwordMatches = false;

        if ($actor instanceof Student) {
            // 1. Öğrencinin aktif kaydının şifresini kontrol et
            if (!empty($actor->password) && Hash::check($currentPassword, $actor->password)) {
                $passwordMatches = true;
            }

            // 2. Öğrencinin aynı TC'ye sahip diğer sezon kayıtlarının şifresini kontrol et
            if (!$passwordMatches && !empty($actor->tc_no)) {
                $otherSeasonStudents = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tc_no', $actor->tc_no)
                    ->where('id', '!=', $actor->id)
                    ->get();

                foreach ($otherSeasonStudents as $s) {
                    if (!empty($s->password) && Hash::check($currentPassword, $s->password)) {
                        $passwordMatches = true;
                        break;
                    }
                }
            }

            if (!$passwordMatches) {
                return $this->error('Mevcut şifre hatalı.', [], 400);
            }

            // Başarılı: Aktif kaydı güncelle
            $actor->update([
                'password' => $hashedNewPassword,
                'is_portal_active' => true,
            ]);

            // Öğrencinin tüm sezonlardaki kayıtlarını güncelle
            if (!empty($actor->tc_no)) {
                Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                    ->where('tc_no', $actor->tc_no)
                    ->update([
                        'password' => $hashedNewPassword,
                        'is_portal_active' => true,
                    ]);
            }

            return $this->success(null, 'Şifre başarıyla değiştirildi.');
        } else {
            if (!empty($actor->password) && Hash::check($currentPassword, $actor->password)) {
                $actor->update(['password' => $hashedNewPassword]);
                return $this->success(null, 'Şifre başarıyla değiştirildi.');
            }
            return $this->error('Mevcut şifre hatalı.', [], 400);
        }
    }

    /**
     * Get student/guardian profile for portal.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $guardian = $this->resolvePortalGuardian($request);
        $student = $this->resolvePortalStudent($request);

        if (!$student) {
            return $this->error('Öğrenci profili bulunamadı.', [], 404);
        }

        $student->load(['classroom.campus', 'classroom.branch', 'city', 'district', 'guardians', 'tenant']);

        if (!$guardian) {
            $guardian = $student->guardians->first();
        }

        $campusName = $student->classroom?->campus?->name
            ?? $student->classroom?->branch?->name
            ?? $student->tenant?->name;

        $phone = $student->phone ?: ($guardian?->phone ?: ($student->emergency_contact_info['phone'] ?? null));

        // Return student info as primary, with guardian info as secondary
        $mappedSiblings = $this->getPortalSiblings($student, $guardian);
        $currentStudentObj = [
            'id' => (int) $student->id,
            'name' => $student->name,
            'student_name' => $student->name,
            'school_no' => $student->school_no,
            'tc_no' => $student->tc_no,
            'classroom_id' => $student->classroom_id ? (int) $student->classroom_id : ($student->classroom?->id ? (int) $student->classroom->id : null),
            'classroom' => $student->classroom ? [
                'id' => (int) $student->classroom->id,
                'name' => $student->classroom->name,
            ] : null,
            'classroom_name' => $student->classroom?->name,
        ];
        $allStudents = collect([$currentStudentObj])->concat($mappedSiblings)->values();

        return $this->success([
            'id' => (int) $student->id,
            'name' => $student->name,
            'student_name' => $student->name,
            'email' => $guardian?->email ?? $student->email,
            'phone' => $phone,
            'campus_name' => $campusName,
            'classroom_id' => $student->classroom_id ? (int) $student->classroom_id : ($student->classroom?->id ? (int) $student->classroom->id : null),
            'classroom_name' => $student->classroom?->name,
            'role' => 'student',
            'role_name' => 'Öğrenci',
            'is_student' => true,
            'school_no' => $student->school_no,
            'guardian' => $guardian ? [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
            ] : null,
            'siblings' => $mappedSiblings,
            'students' => $allStudents,
            'created_at' => $student->created_at?->toIso8601String(),
            'last_login_at' => $guardian?->last_login_at?->toIso8601String(),
        ], 'Öğrenci profili getirildi.');
    }

    /**
     * Kardeş öğrenciye hızlı geçiş (yeni Sanctum token üretip döndürür)
     */
    public function switchSibling(Request $request): JsonResponse
    {
        $targetStudentId = (int) ($request->input('student_id') ?? $request->input('target_student_id'));

        if (!$targetStudentId) {
            return $this->error('Öğrenci ID belirtilmelidir.', [], 422);
        }

        $actor = $request->user();

        $targetStudent = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->with('classroom')
            ->find($targetStudentId);

        if (!$targetStudent) {
            return $this->error('Hedef öğrenci bulunamadı.', [], 404);
        }

        // Yetki kontrolü: Aktör ile hedef öğrenci kardeş mi veya aynı veliye mi bağlı?
        $allowed = false;
        if ($actor instanceof Student) {
            if ((int) $actor->id === $targetStudentId) {
                $allowed = true;
            } else {
                $isSibling = \DB::table('student_siblings')
                    ->where(function ($q) use ($actor, $targetStudentId) {
                        $q->where('student_id', $actor->id)->where('sibling_id', $targetStudentId);
                    })
                    ->orWhere(function ($q) use ($actor, $targetStudentId) {
                        $q->where('student_id', $targetStudentId)->where('sibling_id', $actor->id);
                    })
                    ->exists();

                if (!$isSibling && !empty($actor->sibling_ids)) {
                    $raw = (array) $actor->sibling_ids;
                    if (in_array($targetStudentId, array_map('intval', $raw))) {
                        $isSibling = true;
                    }
                }

                $allowed = $isSibling;
            }
        }

        if (!$allowed) {
            return $this->error('Bu öğrenciye geçiş yetkiniz bulunmamaktadır.', [], 403);
        }

        if (isset($targetStudent->is_portal_active) && !$targetStudent->is_portal_active) {
            return $this->error('Öğrenci portal erişimi aktif değil.', [], 403);
        }

        // Yeni token üret
        $token = $targetStudent->createToken($request->device_name ?? 'EduLem Mobile')->plainTextToken;

        return $this->success([
            'token' => $token,
            'student' => [
                'id' => $targetStudent->id,
                'name' => $targetStudent->name,
                'student_name' => $targetStudent->name,
                'school_no' => $targetStudent->school_no,
                'tc_no' => $targetStudent->tc_no,
                'classroom_name' => $targetStudent->classroom?->name,
                'role' => 'student',
                'role_name' => 'Öğrenci',
            ],
        ], 'Öğrenciye geçiş başarılı.');
    }

    /**
     * Update guardian profile for portal.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $guardian = $this->resolvePortalGuardian($request);
        $student = $this->resolvePortalStudent($request);

        if (!$guardian) {
            return $this->error('Veli profili bulunamadı.', [], 404);
        }

        $validated = $request->validate([
            'email' => 'sometimes|email|unique:guardians,email,' . $guardian->id,
            'phone' => 'nullable|string|max:20',
        ]);

        // Only update guardian contact info, not name
        $guardian->fill($validated);
        $guardian->save();

        // Return consistent structure with getProfile (student-centric)
        return $this->success([
            'id' => $student?->id ?? $guardian->id,
            'name' => $student?->name ?? $guardian->name,
            'email' => $guardian->email,
            'phone' => $guardian->phone,
            'role_name' => 'Öğrenci',
            'school_no' => $student?->school_no,
            'guardian' => [
                'id' => $guardian->id,
                'name' => $guardian->name,
                'email' => $guardian->email,
                'phone' => $guardian->phone,
            ],
        ], 'Profil güncellendi.');
    }

    /**
     * Get calendar events for student.
     */
    public function getCalendar(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        // Öğrenciyle ilgili etkinlikler
        $events = \App\Models\CalendarEvent::where(function ($q) use ($student) {
            // Öğrenci katılımcı olarak eklenmiş
            $q->whereHas('participants', function ($pq) use ($student) {
                $pq->where('student_id', $student->id);
            })
                // Veya hedef kitleye students dahil
                ->orWhere(function ($sq) use ($student) {
                    $sq->where('is_public', true)
                        ->where(function ($tq) use ($student) {
                            $tq->whereJsonContains('target_audience', [['type' => 'all']])
                                ->orWhereJsonContains('target_audience', [['type' => 'students']])
                                ->orWhereJsonContains('target_audience', [['type' => 'specific', 'ids' => [$student->id]]]);
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
    public function getTutoringSessions(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        $sessions = \App\Models\TutoringSession::whereHas('students', function ($q) use ($student) {
            $q->where('students.id', $student->id);
        })
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['lesson', 'teacher'])
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
    public function getOnlineExams(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $query = \App\Models\OnlineExam::where(function ($q) use ($student) {
            $q->where('classroom_id', $student->classroom_id)
                ->orWhereNull('classroom_id');
        })
            ->where('status', 'active')
            ->with(['lesson']);

        $exams = $query->orderBy('start_time', 'desc')->get();

        return $this->success([
            'exams' => $exams->map(function (\App\Models\OnlineExam $exam) use ($student) {
                /** @var \App\Models\OnlineExam $exam */
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
    public function getAppointments(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('end_date', now()->endOfMonth()->format('Y-m-d'));

        // Öğrenciyle ilgili randevular (lead üzerinden)
        $appointments = \App\Models\Appointment::whereHas('lead', function ($q) use ($student) {
            $q->where('student_id', $student->id);
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
    public function getGuidanceNotes(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        // Öğrenci kendi notlarını görebilir (gizli olmayanlar)
        $notes = \App\Models\GuidanceNote::where('student_id', $student->id)
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
    public function getMealMenus(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $startDate = $request->input('start_date')
            ?? $request->input('menu_date_from')
            ?? now()->startOfWeek()->format('Y-m-d');
        $endDate = $request->input('end_date')
            ?? $request->input('menu_date_to')
            ?? now()->endOfWeek()->format('Y-m-d');

        $menus = \App\Models\MealMenu::query()
            ->where('tenant_id', $student->tenant_id)
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
    public function getBulletins(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
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
    public function getActivities(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
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
    public function getSurveys(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        // Form Anketler (hedef kitleye öğrenci dahil)
        $formSurveys = \App\Models\FormSurvey::where('is_active', true)
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
        $onlineSurveys = \App\Models\OnlineSurvey::where('is_active', true)
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
            'form_surveys' => $formSurveys->map(function (\App\Models\FormSurvey $survey) use ($student) {
                /** @var \App\Models\FormSurvey $survey */
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
                    'start_date' => $survey->start_date ? \Carbon\Carbon::parse($survey->start_date)->format('Y-m-d') : null,
                    'end_date' => $survey->end_date ? \Carbon\Carbon::parse($survey->end_date)->format('Y-m-d') : null,
                    'is_required' => false,
                    'has_responded' => $response !== null,
                    'response_id' => $response?->id,
                ];
            }),
            'online_surveys' => $onlineSurveys->map(function (\App\Models\OnlineSurvey $survey) use ($student) {
                /** @var \App\Models\OnlineSurvey $survey */
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
                    'start_date' => $survey->start_date ? \Carbon\Carbon::parse($survey->start_date)->format('Y-m-d') : null,
                    'end_date' => $survey->end_date ? \Carbon\Carbon::parse($survey->end_date)->format('Y-m-d') : null,
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
    public function getQuestions(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $questions = \App\Models\Question::where('student_id', $student->id)
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
    public function getMealAttendance(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
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
    public function getNotifications(Request $request): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        // Laravel notifications (bildirimler)
        $notifications = $student->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // SMS raporları (öğrencinin velilerine gönderilen SMS'ler - guardian telefonlarına göre)
        $guardianPhones = $student->guardians()->pluck('phone')->filter();
        $smsReports = \App\Models\SmsReport::whereIn('phone', $guardianPhones)
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
    public function markNotificationAsRead(Request $request, string $notificationId): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
        }

        $notification = $student->notifications()->where('id', $notificationId)->first();

        if (!$notification) {
            return $this->error('Bildirim bulunamadı.', [], 404);
        }

        $notification->markAsRead();

        return $this->success(null, 'Bildirim okundu olarak işaretlendi.');
    }

    /**
     * Select project homework topic.
     */
    public function selectProjectTopic(Request $request, \App\Models\Homework $homework): JsonResponse
    {
        $student = $this->resolvePortalStudent($request);
        if (!$student) {
            return $this->error('Portal öğrencisi bulunamadı.', [], 404);
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
        // project_topics array'indeki index'i bul
        $topicIndex = array_search($selectedTopic, $homework->project_topics);

        if ($topicIndex === false) {
            return $this->error('Seçilen konu geçersiz.', [], 400);
        }

        $submission = \App\Models\HomeworkSubmission::firstOrNew([
            'homework_id' => $homework->id,
            'student_id' => $student->id,
        ]);

        $submission->project_topic_id = $topicIndex;
        $submission->status = 'pending'; // Konu seçildi, henüz submit edilmedi
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
