<?php

namespace App\Http\Controllers;

use App\Actions\CreateStaffAssignmentAction;
use App\Http\Requests\StoreStaffAssignmentRequest;
use App\Http\Resources\StaffAssignmentResource;
use App\Models\StaffAssignment;
use App\Services\ActivityLogService;
use App\Services\QuestionBankService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class StaffAssignmentController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected QuestionBankService $questionBankService;

    public function __construct(
        ActivityLogService $activityLogService,
        QuestionBankService $questionBankService
    ) {
        $this->activityLogService = $activityLogService;
        $this->questionBankService = $questionBankService;
    }

    /**
     * Display a listing of staff assignments.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', StaffAssignment::class);

        $query = StaffAssignment::with(['teamLeader', 'creator']);

        // Filtreleme
        if (request()->has('assignment_type')) {
            $query->where('assignment_type', request('assignment_type'));
        }

        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('staff_id')) {
            $staffId = request('staff_id');
            $query->whereJsonContains('assigned_staff_ids', $staffId);
        }

        if (request()->has('team_leader_id')) {
            $query->where('team_leader_id', request('team_leader_id'));
        }

        if (request()->has('start_date_from')) {
            $query->where('start_date', '>=', request('start_date_from'));
        }

        if (request()->has('start_date_to')) {
            $query->where('start_date', '<=', request('start_date_to'));
        }

        if (request()->has('show_in_calendar_only')) {
            $query->where('show_in_calendar', true);
        }

        if (request()->has('overdue_only')) {
            $query->where('deadline', '<', Carbon::now())
                ->where('status', '!=', 'completed');
        }

        // Sıralama
        $query->orderBy('start_date', 'desc')
            ->orderBy('created_at', 'desc');

        $assignments = $query->paginate(request('per_page', 50));

        return $this->success([
            'assignments' => StaffAssignmentResource::collection($assignments),
            'pagination' => [
                'current_page' => $assignments->currentPage(),
                'last_page' => $assignments->lastPage(),
                'per_page' => $assignments->perPage(),
                'total' => $assignments->total(),
            ],
        ], 'Personel görevlendirmeleri başarıyla listelendi.');
    }

    /**
     * Store a newly created staff assignment.
     */
    public function store(StoreStaffAssignmentRequest $request, CreateStaffAssignmentAction $action): JsonResponse
    {
        Gate::authorize('create', StaffAssignment::class);

        try {
            $assignment = $action->execute($request->validated());

            return $this->success(new StaffAssignmentResource($assignment), 'Personel görevlendirmesi başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified staff assignment.
     */
    public function show(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('view', $staffAssignment);

        $staffAssignment->load(['teamLeader', 'creator']);

        return $this->success(new StaffAssignmentResource($staffAssignment));
    }

    /**
     * Update the specified staff assignment.
     */
    public function update(StoreStaffAssignmentRequest $request, StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('update', $staffAssignment);

        try {
            $data = $request->validated();

            // Takım kaptanı kontrolü
            if (isset($data['team_leader_id'])) {
                $assignedStaffIds = $data['assigned_staff_ids'] ?? $staffAssignment->assigned_staff_ids;
                if (!in_array($data['team_leader_id'], $assignedStaffIds)) {
                    return $this->error('Takım kaptanı, görevlendirilen personel listesinde olmalıdır.', [], 400);
                }
            }

            $staffAssignment->update($data);
            $this->activityLogService->logUpdate($staffAssignment);

            return $this->success(new StaffAssignmentResource($staffAssignment->fresh()), 'Personel görevlendirmesi başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified staff assignment.
     */
    public function destroy(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('delete', $staffAssignment);

        $this->activityLogService->logDelete($staffAssignment);
        $staffAssignment->delete();

        return $this->success(null, 'Personel görevlendirmesi başarıyla silindi.');
    }

    /**
     * Update completion percentage.
     */
    public function updateCompletion(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('update', $staffAssignment);

        $completionPercentage = request('completion_percentage', 0);

        if ($completionPercentage < 0 || $completionPercentage > 100) {
            return $this->error('Tamamlanma yüzdesi 0-100 arasında olmalıdır.', [], 400);
        }

        $staffAssignment->update([
            'completion_percentage' => $completionPercentage,
            'status' => $completionPercentage >= 100 ? 'completed' : ($completionPercentage > 0 ? 'in_progress' : 'pending'),
        ]);

        $this->activityLogService->logUpdate($staffAssignment);

        return $this->success(new StaffAssignmentResource($staffAssignment->fresh()), 'Tamamlanma yüzdesi başarıyla güncellendi.');
    }

    /**
     * Get calendar events (for ajanda integration).
     */
    public function getCalendarEvents(): JsonResponse
    {
        Gate::authorize('viewAny', StaffAssignment::class);

        $startDate = request('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = request('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $assignments = StaffAssignment::where('show_in_calendar', true)
            ->whereBetween('start_date', [$startDate, $endDate])
            ->orWhereBetween('end_date', [$startDate, $endDate])
            ->orWhere(function ($query) use ($startDate, $endDate) {
                $query->where('start_date', '<=', $startDate)
                    ->where('end_date', '>=', $endDate);
            })
            ->with(['teamLeader', 'creator'])
            ->orderBy('start_date')
            ->get();

        return $this->success([
            'events' => StaffAssignmentResource::collection($assignments),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ], 'Ajanda etkinlikleri başarıyla getirildi.');
    }

    /**
     * Get available questions for assignment (for question selection assignments).
     */
    public function getAvailableQuestions(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('view', $staffAssignment);

        // Sadece soru seçimi görevlendirmeleri için
        if (!in_array($staffAssignment->assignment_type, ['online_exam_question_selection', 'booklet_question_selection'])) {
            return $this->error('Bu görevlendirme türü için soru seçimi yapılamaz.', [], 400);
        }

        // related_data'dan filtreleri al
        $relatedData = $staffAssignment->related_data ?? [];
        $filters = $relatedData['question_filters'] ?? [];

        // QuestionBankService ile soruları getir
        $questions = $this->questionBankService->getQuestionsByFilters($filters);

        return $this->success([
            'questions' => $questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'difficulty_level' => $question->difficulty_level,
                    'lesson' => $question->lesson ? [
                        'id' => $question->lesson->id,
                        'name' => $question->lesson->name,
                    ] : null,
                    'topic' => $question->topic ? [
                        'id' => $question->topic->id,
                        'name' => $question->topic->name,
                    ] : null,
                    'usage_count' => $question->usage_count,
                    'last_used_at' => $question->last_used_at?->format('Y-m-d'),
                ];
            }),
            'total' => $questions->count(),
        ], 'Uygun sorular başarıyla getirildi.');
    }

    /**
     * Select questions for assignment.
     */
    public function selectQuestions(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('update', $staffAssignment);

        // Sadece soru seçimi görevlendirmeleri için
        if (!in_array($staffAssignment->assignment_type, ['online_exam_question_selection', 'booklet_question_selection'])) {
            return $this->error('Bu görevlendirme türü için soru seçimi yapılamaz.', [], 400);
        }

        // Görevlendirilen personel kontrolü
        $user = auth()->user();
        if (!in_array($user->id, $staffAssignment->assigned_staff_ids ?? [])) {
            return $this->error('Bu görevlendirme size ait değil.', [], 403);
        }

        request()->validate([
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['exists:question_banks,id'],
        ]);

        $questionIds = request('question_ids');

        // related_data'yı güncelle
        $relatedData = $staffAssignment->related_data ?? [];
        $relatedData['selected_question_ids'] = $questionIds;
        $relatedData['selected_by'] = $user->id;
        $relatedData['selected_at'] = now()->toDateTimeString();

        $staffAssignment->update([
            'related_data' => $relatedData,
            'completion_percentage' => min(100, $staffAssignment->completion_percentage + 50), // Soru seçimi %50 tamamlanma
        ]);

        // Seçilen soruların usage_count'unu artır
        \App\Models\QuestionBank::whereIn('id', $questionIds)->increment('usage_count', 1);
        \App\Models\QuestionBank::whereIn('id', $questionIds)->update(['last_used_at' => now()]);

        $this->activityLogService->logUpdate($staffAssignment);

        return $this->success([
            'assignment' => new StaffAssignmentResource($staffAssignment->fresh()),
            'selected_questions_count' => count($questionIds),
        ], 'Sorular başarıyla seçildi.');
    }

    /**
     * Get selected questions for assignment.
     */
    public function getSelectedQuestions(StaffAssignment $staffAssignment): JsonResponse
    {
        Gate::authorize('view', $staffAssignment);

        $relatedData = $staffAssignment->related_data ?? [];
        $selectedQuestionIds = $relatedData['selected_question_ids'] ?? [];

        if (empty($selectedQuestionIds)) {
            return $this->success([
                'questions' => [],
                'message' => 'Henüz soru seçilmemiş.',
            ], 'Seçilen sorular getirildi.');
        }

        $questions = \App\Models\QuestionBank::whereIn('id', $selectedQuestionIds)
            ->with(['lesson', 'topic', 'creator'])
            ->get();

        return $this->success([
            'questions' => $questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'difficulty_level' => $question->difficulty_level,
                    'points' => $question->points,
                    'lesson' => $question->lesson ? [
                        'id' => $question->lesson->id,
                        'name' => $question->lesson->name,
                    ] : null,
                    'topic' => $question->topic ? [
                        'id' => $question->topic->id,
                        'name' => $question->topic->name,
                    ] : null,
                ];
            }),
            'selected_by' => $relatedData['selected_by'] ?? null,
            'selected_at' => $relatedData['selected_at'] ?? null,
        ], 'Seçilen sorular başarıyla getirildi.');
    }
}
