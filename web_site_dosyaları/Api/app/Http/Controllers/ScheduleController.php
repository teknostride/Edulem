<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\Classroom;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Database\QueryException;

class ScheduleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Schedule::with(['classroom', 'lesson', 'teacher']);

        $user = auth()->user();
        $roleName = $user && $user->role ? trim((string) $user->role->name) : '';
        $roleId = (int) ($user->role_id ?? 0);
        $teacherRoleNames = ['öğretmen', 'sınıf öğretmeni', 'rehberlik', 'guidance', 'rehber öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        $isTeacherOnly = in_array($roleId, [5, 6], true)
            || ($roleName !== '' && in_array(mb_strtolower($roleName, 'UTF-8'), $teacherRoleNames, true));

        // Filter by day of week
        if ($request->has('day_of_week')) {
            $query->where('day_of_week', $request->day_of_week);
        }

        // Filter by classroom
        if ($request->has('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }

        // Filter by teacher
        if ($isTeacherOnly && $user) {
            $targetTeacherId = (int) $user->id;
            if ($request->has('teacher_id') && (int) $request->teacher_id !== $targetTeacherId) {
                return response()->json(['message' => 'Sadece kendi ders programınızı görüntüleyebilirsiniz.'], 403);
            }
            $query->forTeacher($targetTeacherId);
        } else {
            if ($request->has('teacher_id')) {
                $targetTeacherId = (int) $request->teacher_id;
                $query->forTeacher($targetTeacherId);
            }
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('classroom', function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%");
                })
                    ->orWhereHas('lesson', function ($subQuery) use ($search) {
                        $subQuery->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('teacher', function ($subQuery) use ($search) {
                        $subQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        // Sınıf veya öğretmen seçiliyse ya da öğretmen kullanıcıysa tüm programı getir (sayfalama yok); start_time/end_time HH:mm formatında
        if ($request->filled('classroom_id') || $request->filled('teacher_id') || $isTeacherOnly) {
            $schedules = $query->orderBy('day_of_week')->orderBy('start_time')->get();
            $items = $schedules->map(function ($s) {
                /** @var Schedule $s */
                $arr = $s->toArray();
                if (!empty($s->assistant_teacher_ids)) {
                    $arr['assistant_teachers'] = $s->assistantTeachers()->map(function ($t) {
                        return [
                            'id' => $t->id,
                            'first_name' => $t->first_name,
                            'last_name' => $t->last_name,
                            'name' => $t->name,
                        ];
                    })->values()->all();
                } else {
                    $arr['assistant_teachers'] = [];
                }
                $arr['start_time'] = $s->start_time instanceof \DateTimeInterface
                    ? $s->start_time->format('H:i')
                    : (is_string($s->start_time) ? substr($s->start_time, 0, 5) : $s->start_time);
                $arr['end_time'] = $s->end_time instanceof \DateTimeInterface
                    ? $s->end_time->format('H:i')
                    : (is_string($s->end_time) ? substr($s->end_time, 0, 5) : $s->end_time);
                return $arr;
            });
            return response()->json(['data' => $items->values()->all()]);
        }

        $schedules = $query->orderBy('day_of_week')->orderBy('start_time')->paginate(15);
        return response()->json([
            'data' => $schedules->items(),
            'meta' => [
                'total' => $schedules->total(),
                'per_page' => $schedules->perPage(),
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage()
            ]
        ]);
    }

    public function resetClassroom(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $roleName = $user->role ? $user->role->name : null;
        $teacherOnlyRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        $isTeacherOnly = $roleName && in_array($roleName, $teacherOnlyRoles, true);
        if ($isTeacherOnly) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $managerRoles = ['Müdür', 'Müdür Yardımcısı', 'Kampüs Müdürü', 'Genel Müdür', 'Öğrenci İşleri', 'student_affairs'];
        $isManagerRole = $roleName && in_array($roleName, $managerRoles, true);
        if (!$isManagerRole && method_exists($user, 'hasPermission') && !$user->hasPermission('academic.delete')) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'classroom_id' => 'required|integer|exists:classrooms,id',
        ]);

        $classroom = Classroom::query()->findOrFail((int) $validated['classroom_id']);
        if ($classroom->tenant_id !== $user->tenant_id) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        // Branch manager scope check (same intent as SchedulePolicy)
        try {
            if (method_exists($user, 'managedBranches') && $user->managedBranches()->exists()) {
                $managedBranchIds = $user->managedBranches()->pluck('id')->toArray();
                if (!$classroom->branch_id || !in_array((int) $classroom->branch_id, $managedBranchIds, true)) {
                    return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
                }
            }
        } catch (QueryException $e) {
            // Some installations do not have branch manager columns/relations (e.g. branches.manager_id).
            // Skip this scope check in that case.
        }

        $deleted = Schedule::query()
            ->where('tenant_id', $user->tenant_id)
            ->where('classroom_id', (int) $classroom->id)
            ->delete();

        return response()->json([
            'message' => 'Ders programı sıfırlandı',
            'deleted' => (int) $deleted,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        $teacherOnlyRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        if ($roleName && in_array($roleName, $teacherOnlyRoles, true)) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'lesson_id' => 'required|exists:lessons,id',
            'teacher_id' => 'nullable|exists:users,id',
            'assistant_teacher_ids' => 'nullable|array',
            'assistant_teacher_ids.*' => 'exists:users,id',
            'day_of_week' => 'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'time_slot_id' => 'nullable|exists:time_slots,id',
            'is_active' => 'boolean'
        ]);

        unset($validated['time_slot_id']);
        unset($validated['is_active']);
        $validated['tenant_id'] = auth()->user()?->tenant_id ?? 1;

        // Aynı sınıf + gün + saat zaten varsa güncelle (tekrar ekleme duplicate hatası vermesin)
        $existing = Schedule::where('classroom_id', $validated['classroom_id'])
            ->where('day_of_week', $validated['day_of_week'])
            ->where('start_time', $validated['start_time'])
            ->first();

        if ($existing) {
            $existing->update($validated);
            $existing->load(['classroom', 'lesson', 'teacher']);
            $arr = $existing->toArray();
            if (!empty($existing->assistant_teacher_ids)) {
                $arr['assistant_teachers'] = $existing->assistantTeachers()->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'first_name' => $t->first_name,
                        'last_name' => $t->last_name,
                        'name' => $t->name,
                    ];
                })->values()->all();
            } else {
                $arr['assistant_teachers'] = [];
            }
            return response()->json([
                'data' => $arr,
                'message' => 'Ders programı güncellendi'
            ], 200);
        }

        try {
            $schedule = Schedule::create($validated);
            $schedule->load(['classroom', 'lesson', 'teacher']);
            $arr = $schedule->toArray();
            if (!empty($schedule->assistant_teacher_ids)) {
                $arr['assistant_teachers'] = $schedule->assistantTeachers()->map(function ($t) {
                    return [
                        'id' => $t->id,
                        'first_name' => $t->first_name,
                        'last_name' => $t->last_name,
                        'name' => $t->name,
                    ];
                })->values()->all();
            } else {
                $arr['assistant_teachers'] = [];
            }
            return response()->json([
                'data' => $arr,
                'message' => 'Ders programına eklendi'
            ], 201);
        } catch (UniqueConstraintViolationException $e) {
            return response()->json([
                'message' => 'Bu öğretmen bu saatte zaten başka bir sınıfta ders vermektedir. Başka öğretmen seçin veya farklı saat seçin.'
            ], 422);
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'teacher_schedule_unique') || str_contains($e->getMessage(), '1062')) {
                return response()->json([
                    'message' => 'Bu öğretmen bu saatte zaten başka bir sınıfta ders vermektedir. Başka öğretmen seçin veya farklı saat seçin.'
                ], 422);
            }
            throw $e;
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Schedule $schedule): JsonResponse
    {
        $schedule->load(['classroom', 'lesson', 'teacher']);

        $arr = $schedule->toArray();
        if (!empty($schedule->assistant_teacher_ids)) {
            $arr['assistant_teachers'] = $schedule->assistantTeachers()->map(function ($t) {
                return [
                    'id' => $t->id,
                    'first_name' => $t->first_name,
                    'last_name' => $t->last_name,
                    'name' => $t->name,
                ];
            })->values()->all();
        } else {
            $arr['assistant_teachers'] = [];
        }

        return response()->json([
            'data' => $arr
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        $teacherOnlyRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        if ($roleName && in_array($roleName, $teacherOnlyRoles, true)) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $validated = $request->validate([
            'classroom_id' => 'sometimes|exists:classrooms,id',
            'lesson_id' => 'sometimes|exists:lessons,id',
            'teacher_id' => 'sometimes|nullable|exists:users,id',
            'assistant_teacher_ids' => 'nullable|array',
            'assistant_teacher_ids.*' => 'exists:users,id',
            'day_of_week' => 'sometimes|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'time_slot_id' => 'sometimes|exists:time_slots,id',
            'room' => 'nullable|string|max:255',
            'remote_link' => 'nullable|url',
            'program_type' => 'nullable|in:single,double',
            'program_id' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $schedule->update($validated);
        $schedule->load(['classroom', 'lesson', 'teacher']);

        $arr = $schedule->toArray();
        if (!empty($schedule->assistant_teacher_ids)) {
            $arr['assistant_teachers'] = $schedule->assistantTeachers()->map(function ($t) {
                return [
                    'id' => $t->id,
                    'first_name' => $t->first_name,
                    'last_name' => $t->last_name,
                    'name' => $t->name,
                ];
            })->values()->all();
        } else {
            $arr['assistant_teachers'] = [];
        }

        return response()->json([
            'data' => $arr,
            'message' => 'Schedule updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Schedule $schedule): JsonResponse
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        $teacherOnlyRoles = ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher', 'teacher', 'class_teacher', '5', '6'];
        if ($roleName && in_array($roleName, $teacherOnlyRoles, true)) {
            return response()->json(['message' => 'Bu işlemi yapmaya yetkiniz yok.'], 403);
        }

        $schedule->delete();

        return response()->json([
            'message' => 'Schedule deleted successfully'
        ]);
    }
}
