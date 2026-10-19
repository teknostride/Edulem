<?php

namespace App\Http\Controllers;

use App\Actions\CreateScholarshipExamAction;
use App\Actions\CreateScholarshipExamApplicationAction;
use App\Http\Requests\StoreScholarshipExamRequest;
use App\Http\Requests\StoreScholarshipExamApplicationRequest;
use App\Http\Requests\StoreScholarshipExamSeatingRequest;
use App\Http\Resources\ScholarshipExamResource;
use App\Http\Resources\ScholarshipExamApplicationResource;
use App\Models\ScholarshipExam;
use App\Models\ScholarshipExamApplication;
use App\Services\ActivityLogService;
use App\Services\ScholarshipExamService;
use App\Services\ScholarshipExamEntryDocumentService;
use App\Jobs\GenerateScholarshipExamEntryDocumentJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ScholarshipExamController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected ScholarshipExamService $scholarshipExamService;
    protected ScholarshipExamEntryDocumentService $entryDocumentService;

    public function __construct(
        ActivityLogService $activityLogService,
        ScholarshipExamService $scholarshipExamService,
        ScholarshipExamEntryDocumentService $entryDocumentService
    ) {
        $this->activityLogService = $activityLogService;
        $this->scholarshipExamService = $scholarshipExamService;
        $this->entryDocumentService = $entryDocumentService;
    }

    /**
     * Display a listing of scholarship exams.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', ScholarshipExam::class);

        $query = ScholarshipExam::with(['creator', 'examSpecificationFile']);

        // Filtreleme
        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('exam_date_from')) {
            $query->where('exam_date', '>=', request('exam_date_from'));
        }

        if (request()->has('exam_date_to')) {
            $query->where('exam_date', '<=', request('exam_date_to'));
        }

        // Sıralama
        $query->orderBy('exam_date', 'desc');

        $exams = $query->paginate(request('per_page', 50));

        return $this->success([
            'exams' => ScholarshipExamResource::collection($exams),
            'pagination' => [
                'current_page' => $exams->currentPage(),
                'last_page' => $exams->lastPage(),
                'per_page' => $exams->perPage(),
                'total' => $exams->total(),
            ],
        ], 'Bursluluk sınavları başarıyla listelendi.');
    }

    /**
     * Store a newly created scholarship exam.
     */
    public function store(StoreScholarshipExamRequest $request, CreateScholarshipExamAction $action): JsonResponse
    {
        Gate::authorize('create', ScholarshipExam::class);

        try {
            $exam = $action->execute($request->validated());

            return $this->success(new ScholarshipExamResource($exam), 'Bursluluk sınavı başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified scholarship exam.
     */
    public function show(ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('view', $scholarshipExam);

        $scholarshipExam->load(['creator', 'examSpecificationFile', 'applications.student', 'applications.lead']);

        return $this->success(new ScholarshipExamResource($scholarshipExam));
    }

    /**
     * Update the specified scholarship exam.
     */
    public function update(StoreScholarshipExamRequest $request, ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('update', $scholarshipExam);

        try {
            $scholarshipExam->update($request->validated());
            $this->activityLogService->logUpdate($scholarshipExam);

            return $this->success(new ScholarshipExamResource($scholarshipExam->fresh()), 'Bursluluk sınavı başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified scholarship exam.
     */
    public function destroy(ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('delete', $scholarshipExam);

        $this->activityLogService->logDelete($scholarshipExam);
        $scholarshipExam->delete();

        return $this->success(null, 'Bursluluk sınavı başarıyla silindi.');
    }

    /**
     * Create application for scholarship exam.
     */
    public function createApplication(StoreScholarshipExamApplicationRequest $request, CreateScholarshipExamApplicationAction $action): JsonResponse
    {
        Gate::authorize('view', ScholarshipExam::findOrFail($request->scholarship_exam_id));

        try {
            $application = $action->execute($request->validated());

            return $this->success(new ScholarshipExamApplicationResource($application), 'Başvuru başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Process application (approve and assign classroom).
     */
    public function processApplication(ScholarshipExamApplication $application): JsonResponse
    {
        Gate::authorize('update', $application->scholarshipExam);

        try {
            $application = $this->scholarshipExamService->processApplication($application);

            return $this->success(new ScholarshipExamApplicationResource($application), 'Başvuru başarıyla işlendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get application statistics.
     */
    public function getStatistics(ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('view', $scholarshipExam);

        $statistics = $this->scholarshipExamService->getStatistics($scholarshipExam);

        return $this->success($statistics, 'İstatistikler başarıyla getirildi.');
    }

    /**
     * Get applications for scholarship exam.
     */
    public function getApplications(ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('view', $scholarshipExam);

        $query = $scholarshipExam->applications()->with(['student', 'lead', 'classroom', 'branch']);

        // Filtreleme
        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('session_id')) {
            $query->where('session_id', request('session_id'));
        }

        // Sıralama
        $query->orderBy('created_at', 'desc');

        $applications = $query->paginate(request('per_page', 50));

        return $this->success([
            'applications' => ScholarshipExamApplicationResource::collection($applications),
            'pagination' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ], 'Başvurular başarıyla listelendi.');
    }

    /**
     * Generate scholarship exam entry document PDF.
     */
    public function generateEntryDocument(ScholarshipExam $scholarshipExam): JsonResponse
    {
        Gate::authorize('view', $scholarshipExam);

        try {
            $applicationId = request('application_id'); // Opsiyonel: tek başvuru için
            $async = request('async', true); // Varsayılan: async

            // Onaylanmış başvuru var mı kontrol et
            $hasApprovedApplications = $scholarshipExam->applications()
                ->where('status', 'approved')
                ->exists();
            
            if (!$hasApprovedApplications) {
                return $this->error('Sınav için onaylanmış başvuru bulunamadı.', [], 400);
            }

            if ($async) {
                // Queue'ya ekle
                GenerateScholarshipExamEntryDocumentJob::dispatch($scholarshipExam, $applicationId);

                return $this->success([
                    'exam_id' => $scholarshipExam->id,
                    'application_id' => $applicationId,
                    'message' => 'Bursluluk sınavı giriş belgesi PDF oluşturma işlemi kuyruğa eklendi.',
                ], 'Bursluluk sınavı giriş belgesi oluşturuluyor.');
            } else {
                // Senkron oluştur
                if ($applicationId) {
                    $filePath = $this->entryDocumentService->generateApplicationEntryDocument($scholarshipExam, $applicationId);
                    return $this->success([
                        'exam_id' => $scholarshipExam->id,
                        'application_id' => $applicationId,
                        'file_path' => $filePath,
                        'download_url' => route('api.v1.scholarship-exams.entry-document.download', ['scholarshipExam' => $scholarshipExam->id, 'application' => $applicationId]),
                    ], 'Bursluluk sınavı giriş belgesi başarıyla oluşturuldu.');
                } else {
                    $filePaths = $this->entryDocumentService->generateAllEntryDocuments($scholarshipExam);
                    return $this->success([
                        'exam_id' => $scholarshipExam->id,
                        'total_files' => count($filePaths),
                        'files' => $filePaths,
                    ], 'Tüm bursluluk sınavı giriş belgeleri başarıyla oluşturuldu.');
                }
            }
        } catch (\Exception $e) {
            return $this->error('Bursluluk sınavı giriş belgesi oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Download scholarship exam entry document PDF.
     */
    public function downloadEntryDocument(ScholarshipExam $scholarshipExam, int $applicationId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        Gate::authorize('view', $scholarshipExam);

        try {
            $filePath = $this->entryDocumentService->generateApplicationEntryDocument($scholarshipExam, $applicationId);
            
            return Storage::disk('local')->download($filePath, "bursluluk_sinav_giris_belgesi_{$scholarshipExam->id}_{$applicationId}.pdf");
        } catch (\Exception $e) {
            abort(404, 'Bursluluk sınavı giriş belgesi bulunamadı.');
        }
    }

    /**
     * Generate seating plan (bulk classroom + seat assignment) for approved applications.
     */
    public function generateSeating(ScholarshipExam $scholarshipExam, StoreScholarshipExamSeatingRequest $request): JsonResponse
    {
        Gate::authorize('update', $scholarshipExam);

        try {
            $result = $this->scholarshipExamService->generateSeatingPlan(
                $scholarshipExam,
                $request->validated()['classroom_ids'],
                [
                    'session_id' => $request->validated()['session_id'] ?? null,
                    'shuffle' => $request->validated()['shuffle'] ?? true,
                    'same_school_apart' => $request->validated()['same_school_apart'] ?? false,
                    'same_grade_apart' => $request->validated()['same_grade_apart'] ?? false,
                    'capacity' => $request->validated()['capacity'] ?? [],
                ]
            );

            return $this->success($result, 'Sınav sınıfı yerleştirmesi başarıyla oluşturuldu.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }
}
