<?php

namespace App\Http\Controllers;

use App\Actions\CreateFormSurveyAction;
use App\Actions\CreateFormSurveyResponseAction;
use App\Http\Requests\StoreFormSurveyRequest;
use App\Http\Requests\StoreFormSurveyResponseRequest;
use App\Http\Resources\FormSurveyResource;
use App\Http\Resources\FormSurveyResponseResource;
use App\Models\FormSurvey;
use App\Models\FormSurveyResponse;
use App\Models\Student;
use App\Services\ActivityLogService;
use App\Services\FormSurveyPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class FormSurveyController extends ApiController
{
    protected ActivityLogService $activityLogService;
    protected FormSurveyPdfService $pdfService;

    public function __construct(ActivityLogService $activityLogService, FormSurveyPdfService $pdfService)
    {
        $this->activityLogService = $activityLogService;
        $this->pdfService = $pdfService;
    }

    /**
     * Display a listing of form surveys.
     */
    public function index(): JsonResponse
    {
        // Gate::authorize('viewAny', FormSurvey::class); // Bypass Policy bug

        $hasPermission = method_exists($user, 'hasPermission') ? $user?->hasPermission('form_surveys.read') : false;
        
        $canManage = $user?->is_superadmin 
            || $hasPermission
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        if (!$canManage && !$isStaff && !$isTeacher && !$isGuardianOrStudent) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $query = FormSurvey::with(['creator']);

        // Öğretmen ve veli için sadece aktif ve cevaplanabilir anketleri göster
        if ($isTeacher || $isGuardianOrStudent) {
            $query->where('is_active', true)
                ->where('start_date', '<=', Carbon::now())
                ->where('end_date', '>=', Carbon::now());
        }

        // Filtreleme (sadece yetkili kullanıcılar için)
        if (request()->has('survey_type') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('survey_type', request('survey_type'));
        }

        if (request()->has('active_only') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('is_active', true)
                ->where('start_date', '<=', Carbon::now())
                ->where('end_date', '>=', Carbon::now());
        }

        if (request()->has('start_date_from') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('start_date', '>=', request('start_date_from'));
        }

        if (request()->has('start_date_to') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('start_date', '<=', request('start_date_to'));
        }

        // Sıralama
        $query->orderBy('start_date', 'desc')
            ->orderBy('created_at', 'desc');

        $surveys = $query->paginate(request('per_page', 50));

        return $this->success([
            'surveys' => FormSurveyResource::collection($surveys),
            'pagination' => [
                'current_page' => $surveys->currentPage(),
                'last_page' => $surveys->lastPage(),
                'per_page' => $surveys->perPage(),
                'total' => $surveys->total(),
            ],
        ], 'Form anketleri başarıyla listelendi.');
    }

    /**
     * Store a newly created form survey.
     */
    public function store(StoreFormSurveyRequest $request, CreateFormSurveyAction $action): JsonResponse
    {
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.create'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $survey = $action->execute($request->validated());

            return $this->success(new FormSurveyResource($survey), 'Form anketi başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified form survey.
     */
    public function show(FormSurvey $formSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $formSurvey->load(['creator', 'responses']);

        return $this->success(new FormSurveyResource($formSurvey));
    }

    /**
     * Update the specified form survey.
     */
    public function update(StoreFormSurveyRequest $request, FormSurvey $formSurvey): JsonResponse
    {
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.update'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $formSurvey->update($request->validated());
            $this->activityLogService->logUpdate($formSurvey);

            return $this->success(new FormSurveyResource($formSurvey->fresh()), 'Form anketi başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified form survey.
     */
    public function destroy(FormSurvey $formSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.delete'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $this->activityLogService->logDelete($formSurvey);
        $formSurvey->delete();

        return $this->success(null, 'Form anketi başarıyla silindi.');
    }

    /**
     * Submit survey response.
     */
    public function submitResponse(StoreFormSurveyResponseRequest $request, CreateFormSurveyResponseAction $action): JsonResponse
    {
        // Herkes yanıt verebilir (form validation içinden rol doğrulanır)

        try {
            $response = $action->execute($request->validated());

            return $this->success(new FormSurveyResponseResource($response), 'Anket cevabı başarıyla gönderildi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get survey statistics.
     */
    public function getStatistics(FormSurvey $formSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $totalResponses = $formSurvey->getTotalResponses();
        $anonymousResponses = $formSurvey->responses()->where('is_anonymous', true)->count();
        $nonAnonymousResponses = $totalResponses - $anonymousResponses;

        // Cevaplayan türü bazlı istatistikler
        $byRespondentType = $formSurvey->responses()
            ->selectRaw('respondent_type, COUNT(*) as count')
            ->whereNotNull('respondent_type')
            ->groupBy('respondent_type')
            ->pluck('count', 'respondent_type');

        return $this->success([
            'total_responses' => $totalResponses,
            'anonymous_responses' => $anonymousResponses,
            'non_anonymous_responses' => $nonAnonymousResponses,
            'by_respondent_type' => $byRespondentType,
        ], 'Anket istatistikleri başarıyla getirildi.');
    }

    /**
     * Get survey analysis (general/individual).
     */
    public function getAnalysis(FormSurvey $formSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('form_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $analysisType = request('type', 'general'); // general or individual

        if ($analysisType === 'general') {
            // Genel analiz: Tüm cevapların toplamı
            $responses = $formSurvey->responses()->get();
            
            $analysis = [];
            foreach ($formSurvey->questions as $questionIndex => $question) {
                $questionAnswers = [];
                foreach ($responses as $response) {
                    $answer = collect($response->answers)->firstWhere('question_id', $questionIndex);
                    if ($answer) {
                        $questionAnswers[] = $answer;
                    }
                }
                $analysis[] = [
                    'question_index' => $questionIndex,
                    'question' => $question['question'],
                    'total_answers' => count($questionAnswers),
                    'answers' => $questionAnswers,
                ];
            }

            return $this->success([
                'type' => 'general',
                'analysis' => $analysis,
            ], 'Genel analiz başarıyla getirildi.');
        } else {
            // Bireysel analiz: Her cevaplayan için ayrı analiz
            $responses = $formSurvey->responses()
                ->where('is_anonymous', false)
                ->with(['respondent'])
                ->get();

            $individualAnalysis = $responses->map(function ($response) {
                return [
                    'respondent_id' => $response->respondent_id,
                    'respondent' => $response->respondent ? [
                        'id' => $response->respondent->id,
                        'name' => $response->respondent->name,
                    ] : null,
                    'respondent_type' => $response->respondent_type,
                    'answers' => $response->answers,
                    'notes' => $response->notes,
                    'submitted_at' => $response->created_at?->toISOString(),
                ];
            });

            return $this->success([
                'type' => 'individual',
                'analysis' => $individualAnalysis,
            ], 'Bireysel analiz başarıyla getirildi.');
        }
    }

    /**
     * Generate optical form PDF for form survey.
     */
    public function generateOpticalForm(FormSurvey $formSurvey): JsonResponse
    {
        return $this->error('Bu endpoint devre dışı bırakıldı.', [], 404);

        try {
            $filePath = $this->pdfService->generateOpticalFormPdf($formSurvey);

            return $this->success([
                'file_path' => $filePath,
                'download_url' => route('form-surveys.download-optical-form', ['formSurvey' => $formSurvey->id, 'file' => basename($filePath)]),
            ], 'Optik form PDF başarıyla oluşturuldu.');
        } catch (\Exception $e) {
            return $this->error('Optik form oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Download optical form PDF.
     */
    public function downloadOpticalForm(FormSurvey $formSurvey, string $file): \Illuminate\Http\Response
    {
        abort(404, 'Bu endpoint devre dışı bırakıldı.');

        $filePath = "form-surveys/{$formSurvey->tenant_id}/optical-forms/{$file}";

        if (!Storage::disk('local')->exists($filePath)) {
            abort(404, 'Dosya bulunamadı.');
        }

        return Storage::disk('local')->download($filePath);
    }

    /**
     * Generate personnel survey report card PDF.
     */
    public function generatePersonnelReportCard(FormSurvey $formSurvey): JsonResponse
    {
        $user = auth()->user();
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen', 'Öğrenci İşleri']);
        
        $hasPermission = method_exists($user, 'hasPermission') ? $user?->hasPermission('form_surveys.read') : false;
        
        $canManage = $user?->is_superadmin 
            || $hasPermission
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        if (!$canManage && !$isStaff) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        // Sadece personel anketleri için
        if (!in_array($formSurvey->survey_type, ['teacher', 'staff', 'principal'])) {
            return $this->error('Bu anket türü için personel karnesi oluşturulamaz.', [], 422);
        }

        try {
            $userId = request('user_id'); // İsteğe bağlı: belirli bir kullanıcı için
            $filePath = $this->pdfService->generatePersonnelReportCard($formSurvey, $userId);

            return $this->success([
                'file_path' => $filePath,
                'download_url' => route('form-surveys.download-report-card', ['formSurvey' => $formSurvey->id, 'file' => basename($filePath)]),
            ], 'Personel anket karnesi başarıyla oluşturuldu.');
        } catch (\Exception $e) {
            return $this->error('Personel anket karnesi oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Download personnel report card PDF.
     */
    public function downloadReportCard(FormSurvey $formSurvey, string $file): \Illuminate\Http\Response
    {
        $user = auth()->user();
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen', 'Öğrenci İşleri']);
        
        $hasPermission = method_exists($user, 'hasPermission') ? $user?->hasPermission('form_surveys.read') : false;
        
        $canManage = $user?->is_superadmin 
            || $hasPermission
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        if (!$canManage && !$isStaff) {
             abort(403, 'Bu işlem için yetkiniz bulunmamaktadır.');
        }

        $filePath = "form-surveys/{$formSurvey->tenant_id}/report-cards/{$file}";

        if (!Storage::disk('local')->exists($filePath)) {
            abort(404, 'Dosya bulunamadı.');
        }

        return Storage::disk('local')->download($filePath);
    }
}
