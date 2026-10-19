<?php

namespace App\Http\Controllers;

use App\Actions\CreateExamAction;
use App\Actions\UpdateExamAction;
use App\Http\Requests\StoreExamRequest;
use App\Http\Requests\UpdateExamRequest;
use App\Http\Resources\ExamResource;
use App\Models\Exam;
use App\Services\ActivityLogService;
use App\Services\OpticalFormService;
use App\Services\ExamClassroomArrangementService;
use App\Services\ExamEntryDocumentService;
use App\Jobs\GenerateExamEntryDocumentJob;
use App\Http\Requests\StoreExamClassroomRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ExamController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected OpticalFormService $opticalFormService;
    protected ExamClassroomArrangementService $arrangementService;
    protected ExamEntryDocumentService $entryDocumentService;

    public function __construct(
        ActivityLogService $activityLogService,
        OpticalFormService $opticalFormService,
        ExamClassroomArrangementService $arrangementService,
        ExamEntryDocumentService $entryDocumentService
    ) {
        $this->activityLogService = $activityLogService;
        $this->opticalFormService = $opticalFormService;
        $this->arrangementService = $arrangementService;
        $this->entryDocumentService = $entryDocumentService;
    }

    /**
     * Display a listing of exams.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Exam::class);

        $query = Exam::with(['lesson', 'classroom']);

        // Filtreleme
        if (request()->has('lesson_id')) {
            $query->where('lesson_id', request('lesson_id'));
        }

        if (request()->has('classroom_id')) {
            $query->where('classroom_id', request('classroom_id'));
        }

        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        if (request()->has('exam_date_from')) {
            $query->where('exam_date', '>=', request('exam_date_from'));
        }

        if (request()->has('exam_date_to')) {
            $query->where('exam_date', '<=', request('exam_date_to'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        // Sıralama
        $query->latest('exam_date')->latest('created_at');

        $exams = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Exam::count(),
            'active' => Exam::where('is_active', true)->count(),
            'upcoming' => Exam::where('exam_date', '>=', now())->count(),
            'past' => Exam::where('exam_date', '<', now())->count(),
        ];

        return $this->success([
            'exams' => ExamResource::collection($exams),
            'pagination' => [
                'current_page' => $exams->currentPage(),
                'last_page' => $exams->lastPage(),
                'per_page' => $exams->perPage(),
                'total' => $exams->total(),
            ],
            'statistics' => $stats,
        ], 'Sınavlar başarıyla listelendi.');
    }

    /**
     * Store a newly created exam in storage.
     */
    public function store(StoreExamRequest $request, CreateExamAction $createExamAction): JsonResponse
    {
        Gate::authorize('create', Exam::class);

        $exam = $createExamAction->execute($request->validated());

        return $this->success(new ExamResource($exam), 'Sınav başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified exam.
     */
    public function show(Exam $exam): JsonResponse
    {
        Gate::authorize('view', $exam);

        $exam->load(['lesson', 'classroom', 'grades', 'examClassrooms.classroom', 'examClassrooms.students.student']);

        return $this->success(new ExamResource($exam));
    }

    /**
     * Update the specified exam in storage.
     */
    public function update(UpdateExamRequest $request, Exam $exam, UpdateExamAction $updateExamAction): JsonResponse
    {
        Gate::authorize('update', $exam);

        $updatedExam = $updateExamAction->execute($exam, $request->validated());

        return $this->success(new ExamResource($updatedExam), 'Sınav başarıyla güncellendi.');
    }

    /**
     * Remove the specified exam from storage.
     */
    public function destroy(Exam $exam): JsonResponse
    {
        Gate::authorize('delete', $exam);

        // Eğer sınavda notlar varsa silinemez
        if ($exam->grades()->count() > 0) {
            return $this->error('Bu sınavda notlar bulunduğu için silinemez.', [], 422);
        }

        $this->activityLogService->logDelete($exam);
        $exam->delete();

        return $this->success(null, 'Sınav başarıyla silindi.');
    }

    /**
     * Upload optical form file.
     */
    public function uploadOpticalForm(Exam $exam): JsonResponse
    {
        Gate::authorize('update', $exam);

        if (!$exam->is_optical_form) {
            return $this->error('Bu sınav optik form sınavı değildir.', [], 422);
        }

        $fileId = request('file_id');
        if (!$fileId) {
            return $this->error('Dosya ID zorunludur.', [], 422);
        }

        try {
            $this->opticalFormService->uploadOpticalForm($exam, $fileId);

            return $this->success([
                'exam_id' => $exam->id,
                'optical_form_status' => $exam->fresh()->optical_form_status,
            ], 'Optik form dosyası başarıyla yüklendi.');
        } catch (\Exception $e) {
            return $this->error('Optik form yüklenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Process optical form data.
     */
    public function processOpticalForm(Exam $exam): JsonResponse
    {
        Gate::authorize('update', $exam);

        if (!$exam->is_optical_form) {
            return $this->error('Bu sınav optik form sınavı değildir.', [], 422);
        }

        $formData = request('form_data');
        if (!$formData || !is_array($formData)) {
            return $this->error('Form verisi zorunludur ve array formatında olmalıdır.', [], 422);
        }

        try {
            $result = $this->opticalFormService->processOpticalForm($exam, $formData);

            return $this->success([
                'exam_id' => $exam->id,
                'processed' => $result['processed'],
                'errors' => $result['errors'],
                'status' => $result['status'],
                'optical_form_status' => $exam->fresh()->optical_form_status,
            ], "{$result['processed']} öğrenci başarıyla işlendi.");
        } catch (\Exception $e) {
            return $this->error('Optik form işlenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Arrange students to exam classrooms.
     */
    public function arrangeClassrooms(Exam $exam, StoreExamClassroomRequest $request): JsonResponse
    {
        Gate::authorize('update', $exam);

        try {
            $arrangements = $this->arrangementService->arrangeStudents(
                $exam,
                $request->validated()['classroom_ids'],
                [
                    'shuffle' => $request->validated()['shuffle'] ?? true,
                    'sort_by' => $request->validated()['sort_by'] ?? 'surname',
                    'preserve_classroom' => $request->validated()['preserve_classroom'] ?? false,
                    'capacity' => $request->validated()['capacity'] ?? [],
                ]
            );

            return $this->success([
                'exam_id' => $exam->id,
                'arrangements' => $arrangements,
            ], 'Öğrenciler başarıyla dersliklere yerleştirildi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get arrangement lists sorted by different criteria.
     */
    public function getArrangementLists(Exam $exam): JsonResponse
    {
        Gate::authorize('view', $exam);

        $sortBy = request('sort_by', 'room');

        try {
            $lists = $this->arrangementService->getArrangementLists($exam, $sortBy);

            return $this->success([
                'exam_id' => $exam->id,
                'sort_by' => $sortBy,
                'lists' => $lists,
            ], 'Sınav düzenleme listeleri başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 500);
        }
    }

    /**
     * Clear exam classroom arrangement.
     */
    public function clearArrangement(Exam $exam): JsonResponse
    {
        Gate::authorize('update', $exam);

        try {
            $this->arrangementService->clearArrangement($exam);

            return $this->success(null, 'Sınav düzenlemesi başarıyla temizlendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 500);
        }
    }

    /**
     * Generate exam entry document PDF.
     */
    public function generateEntryDocument(Exam $exam): JsonResponse
    {
        Gate::authorize('view', $exam);

        try {
            $studentId = request('student_id'); // Opsiyonel: tek öğrenci için
            $async = request('async', true); // Varsayılan: async

            // Sınav düzenlemesi yapılmış mı kontrol et
            $hasArrangement = \App\Models\ExamClassroom::where('exam_id', $exam->id)->exists();
            if (!$hasArrangement) {
                return $this->error('Sınav için derslik düzenlemesi yapılmamış. Önce öğrencileri dersliklere yerleştirin.', [], 400);
            }

            if ($async) {
                // Queue'ya ekle
                GenerateExamEntryDocumentJob::dispatch($exam, $studentId);

                return $this->success([
                    'exam_id' => $exam->id,
                    'student_id' => $studentId,
                    'message' => 'Sınav giriş belgesi PDF oluşturma işlemi kuyruğa eklendi.',
                ], 'Sınav giriş belgesi oluşturuluyor.');
            } else {
                // Senkron oluştur
                if ($studentId) {
                    $filePath = $this->entryDocumentService->generateStudentEntryDocument($exam, $studentId);
                    return $this->success([
                        'exam_id' => $exam->id,
                        'student_id' => $studentId,
                        'file_path' => $filePath,
                        'download_url' => route('api.v1.exams.entry-document.download', ['exam' => $exam->id, 'student' => $studentId]),
                    ], 'Sınav giriş belgesi başarıyla oluşturuldu.');
                } else {
                    $filePaths = $this->entryDocumentService->generateAllEntryDocuments($exam);
                    return $this->success([
                        'exam_id' => $exam->id,
                        'total_files' => count($filePaths),
                        'files' => $filePaths,
                    ], 'Tüm sınav giriş belgeleri başarıyla oluşturuldu.');
                }
            }
        } catch (\Exception $e) {
            return $this->error('Sınav giriş belgesi oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Download exam entry document PDF.
     */
    public function downloadEntryDocument(Exam $exam, int $studentId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        Gate::authorize('view', $exam);

        try {
            $filePath = $this->entryDocumentService->generateStudentEntryDocument($exam, $studentId);
            
            return Storage::disk('local')->download($filePath, "sinav_giris_belgesi_{$exam->id}_{$studentId}.pdf");
        } catch (\Exception $e) {
            abort(404, 'Sınav giriş belgesi bulunamadı.');
        }
    }
}
