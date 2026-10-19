<?php

namespace App\Http\Controllers;

use App\Models\CounselingStudent;
use App\Models\CounselingSession;
use App\Models\CounselingNote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CounselingController extends Controller
{
    private function guardAgainstStudentAffairs(Request $request): ?JsonResponse
    {
        $user = $request->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if (in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true)) {
            return response()->json([
                'message' => 'Bu modüle erişim yetkiniz yok.'
            ], 403);
        }

        return null;
    }

    /**
     * Get counseling students list
     */
    public function getStudents(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $query = CounselingStudent::with(['student', 'counselor'])
                ->select('counseling_students.*');

            // Apply filters
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->whereHas('student', function ($q) use ($search) {
                    $q->where(function ($subQuery) use ($search) {
                        $subQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                });
            }

            if ($request->has('counselor_id')) {
                $query->where('counselor_id', $request->counselor_id);
            }

            if ($request->filled('campus_id')) {
                $campusId = (int) $request->campus_id;
                $query->whereHas('student', function ($q) use ($campusId) {
                    $q->whereHas('classroom.educationLevel', function ($q2) use ($campusId) {
                        $q2->where('campus_id', $campusId);
                    });
                });
            }

            if ($request->filled('education_level_id')) {
                $levelId = (int) $request->education_level_id;
                $query->whereHas('student', function ($q) use ($levelId) {
                    $q->where('education_level_id', $levelId)
                        ->orWhereHas('classroom', function ($q2) use ($levelId) {
                            $q2->where('education_level_id', $levelId)
                                ->orWhere('grade_level', $levelId);
                        });
                });
            }

            if ($request->filled('classroom_id')) {
                $classroomId = (int) $request->classroom_id;
                $query->whereHas('student', function ($q) use ($classroomId) {
                    $q->where('classroom_id', $classroomId);
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);

            $students = $query->orderBy('last_session_date', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'data' => $students->items(),
                'meta' => [
                    'current_page' => $students->currentPage(),
                    'last_page' => $students->lastPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Danışanlar yüklenemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get counseling sessions list
     */
    public function getSessions(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $query = CounselingSession::with(['counselingStudent.student', 'counselor'])
                ->select('counseling_sessions.*');

            // Apply filters
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->has('type') && $request->type !== 'all') {
                $query->where('type', $request->type);
            }

            if ($request->has('counselor_id')) {
                $query->where('counselor_id', $request->counselor_id);
            }

            if ($request->has('student_id')) {
                $query->where('counseling_student_id', $request->student_id);
            }

            // Date range filter
            if ($request->has('date_from')) {
                $query->where('session_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('session_date', '<=', $request->date_to);
            }

            // Pagination
            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);

            $sessions = $query->orderBy('session_date', 'desc')
                ->orderBy('session_time', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'data' => $sessions->items(),
                'meta' => [
                    'current_page' => $sessions->currentPage(),
                    'last_page' => $sessions->lastPage(),
                    'per_page' => $sessions->perPage(),
                    'total' => $sessions->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Görüşmeler yüklenemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new counseling student
     */
    public function createStudent(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $validated = $request->validate([
                'student_id' => 'required|exists:users,id',
                'counselor_id' => 'nullable|exists:users,id',
                'parent_name' => 'required|string|max:255',
                'parent_phone' => 'required|string|max:20',
                'issues' => 'required|array',
                'issues.*' => 'string|max:255',
                'status' => 'required|in:active,inactive,completed',
                'notes' => 'nullable|string',
            ]);

            $student = CounselingStudent::create($validated);

            return response()->json([
                'data' => $student->load(['student', 'counselor']),
                'message' => 'Danışan başarıyla oluşturuldu'
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validasyon hatası',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Danışan oluşturulamadı: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new counseling session
     */
    public function createSession(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $validated = $request->validate([
                'counseling_student_id' => 'required|exists:counseling_students,id',
                'counselor_id' => 'required|exists:users,id',
                'session_date' => 'required|date',
                'session_time' => 'required|string',
                'duration_minutes' => 'required|integer|min:15|max:180',
                'type' => 'required|in:individual,group,parent,emergency',
                'status' => 'required|in:scheduled,completed,cancelled,no_show',
                'notes' => 'nullable|string',
                'counselor_notes' => 'nullable|string',
                'student_feedback' => 'nullable|string',
                'fee' => 'nullable|numeric|min:0',
                'is_paid' => 'boolean',
                'location' => 'nullable|string|max:255',
            ]);

            $session = CounselingSession::create($validated);

            // Update student's session count and last session date
            $student = CounselingStudent::find($validated['counseling_student_id']);
            $student->incrementSessionCount();

            return response()->json([
                'data' => $session->load(['counselingStudent.student', 'counselor']),
                'message' => 'Görüşme başarıyla oluşturuldu'
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validasyon hatası',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Görüşme oluşturulamadı: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get counseling statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $stats = [
                'total_students' => CounselingStudent::count(),
                'active_students' => CounselingStudent::where('status', 'active')->count(),
                'completed_students' => CounselingStudent::where('status', 'completed')->count(),
                'total_sessions' => CounselingSession::count(),
                'completed_sessions' => CounselingSession::where('status', 'completed')->count(),
                'scheduled_sessions' => CounselingSession::where('status', 'scheduled')->count(),
                'cancelled_sessions' => CounselingSession::where('status', 'cancelled')->count(),
                'this_month_sessions' => CounselingSession::whereMonth('session_date', now()->month)
                    ->whereYear('session_date', now()->year)
                    ->count(),
                'counselors' => User::whereHas('counselingStudents')->count(),
            ];

            return response()->json([
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'İstatistikler yüklenemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get counseling notes list
     */
    public function getNotes(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $query = CounselingNote::with(['student', 'counselor'])
                ->orderBy('created_at', 'desc');

            if ($request->has('student_id')) {
                $query->where('student_id', $request->student_id);
            }

            if ($request->has('counselor_id')) {
                $query->where('counselor_id', $request->counselor_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 10);
            $notes = $query->paginate($perPage);

            return response()->json([
                'data' => $notes->items(),
                'meta' => [
                    'current_page' => $notes->currentPage(),
                    'last_page' => $notes->lastPage(),
                    'per_page' => $notes->perPage(),
                    'total' => $notes->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Notlar yüklenemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new counseling note
     */
    public function createNote(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $validated = $request->validate([
                'student_id' => 'required|exists:users,id',
                'counselor_id' => 'required|exists:users,id',
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'tags' => 'nullable|array',
                'is_private' => 'boolean',
            ]);

            $note = CounselingNote::create($validated);

            return response()->json([
                'data' => $note->load(['student', 'counselor']),
                'message' => 'Not başarıyla oluşturuldu'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Not oluşturulamadı: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update counseling note
     */
    public function updateNote(Request $request, $id): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $note = CounselingNote::findOrFail($id);

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'content' => 'sometimes|required|string',
                'tags' => 'nullable|array',
                'is_private' => 'boolean',
            ]);

            $note->update($validated);

            return response()->json([
                'data' => $note->load(['student', 'counselor']),
                'message' => 'Not başarıyla güncellendi'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Not güncellenemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete counseling note
     */
    public function deleteNote(Request $request, $id): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $note = CounselingNote::findOrFail($id);
            $note->delete();

            return response()->json([
                'message' => 'Not başarıyla silindi'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Not silinemedi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available counselors
     */
    public function getCounselors(Request $request): JsonResponse
    {
        try {
            if ($guard = $this->guardAgainstStudentAffairs($request)) {
                return $guard;
            }

            $counselors = User::whereHas('counselingStudents')
                ->orWhereHas('counselingSessions')
                ->select('id', 'first_name', 'last_name', 'email')
                ->get();

            return response()->json([
                'data' => $counselors
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Danışmanlar yüklenemedi: ' . $e->getMessage()
            ], 500);
        }
    }
}
