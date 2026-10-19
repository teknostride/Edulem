<?php

namespace App\Http\Controllers;

use App\Actions\CreateGuidanceNoteAction;
use App\Http\Requests\StoreGuidanceNoteRequest;
use App\Http\Resources\GuidanceNoteResource;
use App\Models\GuidanceNote;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Carbon\Carbon;

class GuidanceNoteController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of guidance notes.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', GuidanceNote::class);

        $query = GuidanceNote::with(['student', 'counselor', 'appointment', 'creator']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('counselor_id')) {
            $query->where('counselor_id', request('counselor_id'));
        }

        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        if (request()->has('note_date_from')) {
            $query->where('note_date', '>=', request('note_date_from'));
        }

        if (request()->has('note_date_to')) {
            $query->where('note_date', '<=', request('note_date_to'));
        }

        if (request()->has('is_confidential')) {
            $query->where('is_confidential', request('is_confidential'));
        }

        if (request()->has('requires_admin_review')) {
            $query->where('requires_admin_review', request('requires_admin_review'));
        }

        // Veli görüntüleme kontrolü
        if (request()->has('guardian_view')) {
            $query->where('is_visible_to_guardian', true)
                ->where('is_confidential', false);
        }

        // Sıralama
        $query->orderBy('note_date', 'desc')
            ->orderBy('note_time', 'desc');

        $notes = $query->paginate(request('per_page', 50));

        return $this->success([
            'notes' => GuidanceNoteResource::collection($notes),
            'pagination' => [
                'current_page' => $notes->currentPage(),
                'last_page' => $notes->lastPage(),
                'per_page' => $notes->perPage(),
                'total' => $notes->total(),
            ],
        ], 'Rehberlik notları başarıyla listelendi.');
    }

    /**
     * Store a newly created guidance note.
     */
    public function store(StoreGuidanceNoteRequest $request, CreateGuidanceNoteAction $action): JsonResponse
    {
        Gate::authorize('create', GuidanceNote::class);

        try {
            $note = $action->execute($request->validated());

            return $this->success(new GuidanceNoteResource($note), 'Rehberlik notu başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified guidance note.
     */
    public function show(GuidanceNote $guidanceNote): JsonResponse
    {
        Gate::authorize('view', $guidanceNote);

        $guidanceNote->load(['student', 'counselor', 'appointment', 'creator', 'approver']);

        return $this->success(new GuidanceNoteResource($guidanceNote));
    }

    /**
     * Update the specified guidance note.
     */
    public function update(StoreGuidanceNoteRequest $request, GuidanceNote $guidanceNote): JsonResponse
    {
        Gate::authorize('update', $guidanceNote);

        try {
            $guidanceNote->update($request->validated());
            $this->activityLogService->logUpdate($guidanceNote);

            return $this->success(new GuidanceNoteResource($guidanceNote->fresh()), 'Rehberlik notu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified guidance note.
     */
    public function destroy(GuidanceNote $guidanceNote): JsonResponse
    {
        Gate::authorize('delete', $guidanceNote);

        $this->activityLogService->logDelete($guidanceNote);
        $guidanceNote->delete();

        return $this->success(null, 'Rehberlik notu başarıyla silindi.');
    }

    /**
     * Approve guidance note (admin).
     */
    public function approve(GuidanceNote $guidanceNote): JsonResponse
    {
        Gate::authorize('update', $guidanceNote);

        if (!$guidanceNote->requires_admin_review) {
            return $this->error('Bu not idare kontrolü gerektirmiyor.', [], 400);
        }

        if ($guidanceNote->is_admin_approved) {
            return $this->error('Bu not zaten onaylanmış.', [], 400);
        }

        $guidanceNote->update([
            'is_admin_approved' => true,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        $this->activityLogService->logUpdate($guidanceNote);

        return $this->success(new GuidanceNoteResource($guidanceNote->fresh()), 'Rehberlik notu başarıyla onaylandı.');
    }

    /**
     * Get counselor statistics.
     */
    public function getCounselorStatistics(int $counselorId): JsonResponse
    {
        Gate::authorize('viewAny', GuidanceNote::class);

        $dateFrom = request('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $dateTo = request('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $totalNotes = GuidanceNote::where('counselor_id', $counselorId)
            ->whereBetween('note_date', [$dateFrom, $dateTo])
            ->count();

        $byType = GuidanceNote::where('counselor_id', $counselorId)
            ->whereBetween('note_date', [$dateFrom, $dateTo])
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type');

        $uniqueStudents = GuidanceNote::where('counselor_id', $counselorId)
            ->whereBetween('note_date', [$dateFrom, $dateTo])
            ->distinct('student_id')
            ->count('student_id');

        $pendingReview = GuidanceNote::where('counselor_id', $counselorId)
            ->where('requires_admin_review', true)
            ->where('is_admin_approved', false)
            ->count();

        return $this->success([
            'counselor_id' => $counselorId,
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_notes' => $totalNotes,
            'by_type' => $byType,
            'unique_students' => $uniqueStudents,
            'pending_review' => $pendingReview,
        ], 'Rehber istatistikleri başarıyla getirildi.');
    }

    /**
     * Get student guidance notes (for guardian view).
     */
    public function getStudentNotes(int $studentId): JsonResponse
    {
        // Veli görüntüleme için özel kontrol
        $query = GuidanceNote::where('student_id', $studentId)
            ->where('is_visible_to_guardian', true)
            ->where('is_confidential', false)
            ->with(['counselor'])
            ->orderBy('note_date', 'desc')
            ->orderBy('note_time', 'desc');

        $notes = $query->paginate(request('per_page', 50));

        return $this->success([
            'notes' => GuidanceNoteResource::collection($notes),
            'pagination' => [
                'current_page' => $notes->currentPage(),
                'last_page' => $notes->lastPage(),
                'per_page' => $notes->perPage(),
                'total' => $notes->total(),
            ],
        ], 'Öğrenci rehberlik notları başarıyla getirildi.');
    }
}
