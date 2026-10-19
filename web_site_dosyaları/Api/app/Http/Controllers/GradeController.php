<?php

namespace App\Http\Controllers;

use App\Actions\CreateGradeAction;
use App\Actions\UpdateGradeAction;
use App\Http\Requests\StoreGradeRequest;
use App\Http\Requests\UpdateGradeRequest;
use App\Http\Resources\GradeResource;
use App\Models\Grade;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class GradeController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of grades.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Grade::class);

        $query = Grade::with(['student', 'exam', 'teacher']);

        // Filtreleme
        if (request()->has('student_id')) {
            $query->where('student_id', request('student_id'));
        }

        if (request()->has('exam_id')) {
            $query->where('exam_id', request('exam_id'));
        }

        if (request()->has('classroom_id')) {
            $query->whereHas('student', function ($q) {
                $q->where('classroom_id', request('classroom_id'));
            });
        }

        if (request()->has('lesson_id')) {
            $query->whereHas('exam', function ($q) {
                $q->where('lesson_id', request('lesson_id'));
            });
        }

        if (request()->has('grade_min')) {
            $query->where('grade', '>=', request('grade_min'));
        }

        if (request()->has('grade_max')) {
            $query->where('grade', '<=', request('grade_max'));
        }

        if (request()->has('grade_type')) {
            $query->where('grade_type', request('grade_type'));
        }

        if (request()->has('semester')) {
            $query->where('semester', request('semester'));
        }

        // Row-level security: Öğretmen sadece kendi girdiği notları görür
        $user = auth()->user();
        $role = $user->role ?? null;
        if ($role && $role->name === 'teacher') {
            $query->where('teacher_id', $user->id);
        }

        // Sıralama
        $query->latest('created_at');

        $grades = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Grade::count(),
            'average' => (float) Grade::avg('grade'),
            'min' => (float) Grade::min('grade'),
            'max' => (float) Grade::max('grade'),
        ];

        return $this->success([
            'grades' => GradeResource::collection($grades),
            'pagination' => [
                'current_page' => $grades->currentPage(),
                'last_page' => $grades->lastPage(),
                'per_page' => $grades->perPage(),
                'total' => $grades->total(),
            ],
            'statistics' => $stats,
        ], 'Notlar başarıyla listelendi.');
    }

    /**
     * Store a newly created grade in storage.
     */
    public function store(StoreGradeRequest $request, CreateGradeAction $createGradeAction): JsonResponse
    {
        Gate::authorize('create', Grade::class);

        try {
            $grade = $createGradeAction->execute($request->validated());
            return $this->success(new GradeResource($grade), 'Not başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 422);
        }
    }

    /**
     * Display the specified grade.
     */
    public function show(Grade $grade): JsonResponse
    {
        Gate::authorize('view', $grade);

        return $this->success(new GradeResource($grade->load(['student', 'exam', 'teacher'])));
    }

    /**
     * Update the specified grade in storage.
     */
    public function update(UpdateGradeRequest $request, Grade $grade, UpdateGradeAction $updateGradeAction): JsonResponse
    {
        Gate::authorize('update', $grade);

        $updatedGrade = $updateGradeAction->execute($grade, $request->validated());

        return $this->success(new GradeResource($updatedGrade), 'Not başarıyla güncellendi.');
    }

    /**
     * Remove the specified grade from storage.
     */
    public function destroy(Grade $grade): JsonResponse
    {
        Gate::authorize('delete', $grade);

        $this->activityLogService->logDelete($grade);
        $grade->delete();

        return $this->success(null, 'Not başarıyla silindi.');
    }

    /**
     * Store multiple grades at once.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        Gate::authorize('create', Grade::class);

        $validated = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'grades' => 'required|array',
            'grades.*.student_id' => 'required|exists:students,id',
            'grades.*.grade' => 'required|numeric|min:0|max:100',
            'grades.*.notes' => 'nullable|string|max:255',
        ]);

        $examId = $validated['exam_id'];
        $teacherId = auth()->id();
        $results = [];

        DB::beginTransaction();
        try {
            foreach ($validated['grades'] as $gradeData) {
                $grade = Grade::updateOrCreate(
                    [
                        'exam_id' => $examId,
                        'student_id' => $gradeData['student_id'],
                    ],
                    [
                        'grade' => $gradeData['grade'],
                        'notes' => $gradeData['notes'] ?? null,
                        'teacher_id' => $teacherId,
                        'grade_type' => 'exam', // Varsayılan exam
                    ]
                );
                $results[] = $grade->id;
            }
            DB::commit();

            return $this->success(['count' => count($results)], 'Notlar başarıyla kaydedildi.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Notlar kaydedilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Generate report card PDF for a student.
     */
    public function generateReportCard(): JsonResponse
    {
        Gate::authorize('viewAny', Grade::class);

        $request = request();

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'semester' => ['required', 'string', 'in:first,second'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'template_id' => ['nullable', 'integer', 'exists:report_card_templates,id'],
            'queue' => ['sometimes', 'boolean'], // Queue'ya ekle mi?
        ]);

        $user = auth()->user();
        $studentId = $validated['student_id'];
        $semester = $validated['semester'];
        $academicYearId = $validated['academic_year_id'] ?? null;
        $templateId = $validated['template_id'] ?? null;
        $useQueue = $validated['queue'] ?? true;

        // Queue kullanılacaksa
        if ($useQueue) {
            \App\Jobs\GenerateReportCardPdfJob::dispatch(
                $studentId,
                $semester,
                $academicYearId,
                $templateId,
                $user->id,
                $user->tenant_id
            );

            return $this->success([
                'student_id' => $studentId,
                'semester' => $semester,
                'message' => 'Karne PDF oluşturma işlemi kuyruğa eklendi.',
            ], 'Karne PDF oluşturma işlemi başlatıldı.');
        }

        // Senkron oluştur
        $reportCardService = app(\App\Services\ReportCardService::class);
        $filePath = $reportCardService->generatePdf(
            $studentId,
            $semester,
            $academicYearId,
            $templateId
        );

        return $this->success([
            'student_id' => $studentId,
            'semester' => $semester,
            'file_path' => $filePath,
            'download_url' => route('api.v1.grades.report-card.download', [
                'student_id' => $studentId,
                'semester' => $semester,
            ]),
        ], 'Karne PDF başarıyla oluşturuldu.');
    }

    /**
     * Download report card PDF.
     */
    public function downloadReportCard(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        Gate::authorize('viewAny', Grade::class);

        $request = request();

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'semester' => ['required', 'string', 'in:first,second'],
        ]);

        $reportCardService = app(\App\Services\ReportCardService::class);
        $filePath = $reportCardService->generatePdf(
            $validated['student_id'],
            $validated['semester']
        );

        $fullPath = storage_path('app/' . $filePath);

        if (!file_exists($fullPath)) {
            abort(404, 'Karne PDF dosyası bulunamadı.');
        }

        return response()->download($fullPath);
    }
}
