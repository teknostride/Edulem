<?php

namespace App\Http\Controllers;

use App\Actions\CreateOnlineSurveyAction;
use App\Actions\CreateOnlineSurveyQuestionAction;
use App\Actions\CreateOnlineSurveyResponseAction;
use App\Http\Requests\StoreOnlineSurveyRequest;
use App\Http\Requests\StoreOnlineSurveyQuestionRequest;
use App\Http\Requests\StoreOnlineSurveyResponseRequest;
use App\Http\Resources\OnlineSurveyResource;
use App\Http\Resources\OnlineSurveyQuestionResource;
use App\Http\Resources\OnlineSurveyResponseResource;
use App\Models\OnlineSurvey;
use App\Models\OnlineSurveyQuestion;
use App\Models\OnlineSurveyResponse;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\User;
use App\Models\Campus;
use App\Models\EducationLevel;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class OnlineSurveyController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of online surveys.
     */
    public function index(): JsonResponse
    {
        // Gate::authorize('viewAny', OnlineSurvey::class); // Bypass Policy bug

        $user = auth()->user();
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen', 'Öğrenci İşleri']);
        $isTeacher = in_array((int) $user?->role_id, [5, 6], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen']);
        $isGuardianOrStudent = ($user instanceof Student) || $user?->role === 'student' || $user?->role === 'Öğrenci' || $user?->role_label === 'Veli';
        
        $hasPermission = method_exists($user, 'hasPermission') ? $user?->hasPermission('online_surveys.read') : false;
        
        $canManage = $user?->is_superadmin 
            || $hasPermission
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        if (!$canManage && !$isStaff && !$isTeacher && !$isGuardianOrStudent) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $query = OnlineSurvey::with(['creator', 'questions']);

        // Öğretmen ve veli için sadece aktif ve cevaplanabilir anketleri göster
        if ($isTeacher || $isGuardianOrStudent) {
            $query->where('is_active', true)
                ->where('start_date', '<=', Carbon::now());

            // Varsayılan davranış: sadece hala cevaplanabilir anketler
            // include_past=1 gelirse geçmiş (bitmiş) anketleri de listele
            if (!request()->boolean('include_past')) {
                $query->where('end_date', '>=', Carbon::now());
            }
        }

        // Filtreleme (sadece yetkili kullanıcılar için)
        if (request()->has('active_only') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('is_active', true)
                ->where('start_date', '<=', Carbon::now())
                ->where('end_date', '>=', Carbon::now());
        }

        if (request()->has('required_only') && !$isTeacher && !$isGuardianOrStudent) {
            $query->where('is_required', true);
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
            'surveys' => OnlineSurveyResource::collection($surveys),
            'pagination' => [
                'current_page' => $surveys->currentPage(),
                'last_page' => $surveys->lastPage(),
                'per_page' => $surveys->perPage(),
                'total' => $surveys->total(),
            ],
        ], 'Online anketler başarıyla listelendi.');
    }

    public function store(StoreOnlineSurveyRequest $request, CreateOnlineSurveyAction $action): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.create'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $survey = $action->execute($request->validated());

            // Hedef kitleye anket bildirimi gönder
            try {
                $fcm = app(\App\Services\FcmService::class);
                $title = "Yeni Anket: {$survey->title}";
                $body = "Görüşleriniz bizim için değerli. Lütfen anketi doldurunuz.";
                $data = [
                    'type' => 'survey',
                    'surveyId' => (string) $survey->id,
                    'route' => '/surveys/' . $survey->id,
                ];

                $studentIds = \App\Models\Student::where('tenant_id', $user->tenant_id)->where('is_active', true)->pluck('id')->toArray();
                if (!empty($studentIds)) {
                    $fcm->sendToStudents($studentIds, $title, $body, $data);
                }
            } catch (\Throwable $e) {
                Log::warning('Anket push bildirimi gönderilemedi: ' . $e->getMessage());
            }

            return $this->success(new OnlineSurveyResource($survey), 'Online anket başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    public function show(OnlineSurvey $onlineSurvey): JsonResponse
    {
        $user = auth()->user();
        $isStaff = in_array((int) $user?->role_id, [5, 6, 11], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen', 'Öğrenci İşleri']);
        $isTeacher = in_array((int) $user?->role_id, [5, 6], true) || in_array($user?->role?->name, ['Öğretmen', 'Sınıf Öğretmeni', 'Rehberlik', 'Rehber Öğretmen']);
        $isGuardianOrStudent = ($user instanceof Student) || $user?->role === 'student' || $user?->role === 'Öğrenci' || $user?->role_label === 'Veli';

        $hasPermission = method_exists($user, 'hasPermission') ? $user?->hasPermission('online_surveys.read') : false;
        $canManage = $user?->is_superadmin 
            || $hasPermission
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);

        if (!$canManage && !$isStaff && !$isTeacher && !$isGuardianOrStudent) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $onlineSurvey->load(['creator', 'questions', 'responses']);

        return $this->success(new OnlineSurveyResource($onlineSurvey));
    }

    /**
     * Update the specified online survey.
     */
    public function update(StoreOnlineSurveyRequest $request, OnlineSurvey $onlineSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.update'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $onlineSurvey->update($request->validated());
            $this->activityLogService->logUpdate($onlineSurvey);

            return $this->success(new OnlineSurveyResource($onlineSurvey->fresh()), 'Online anket başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Remove the specified online survey.
     */
    public function destroy(OnlineSurvey $onlineSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.delete'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $this->activityLogService->logDelete($onlineSurvey);
        $onlineSurvey->delete();

        return $this->success(null, 'Online anket başarıyla silindi.');
    }

    /**
     * Add question to survey.
     */
    public function addQuestion(StoreOnlineSurveyQuestionRequest $request, CreateOnlineSurveyQuestionAction $action): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.update'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $question = $action->execute($request->validated());

            return $this->success(new OnlineSurveyQuestionResource($question), 'Soru başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Update question.
     */
    public function updateQuestion(StoreOnlineSurveyQuestionRequest $request, OnlineSurveyQuestion $onlineSurveyQuestion): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.update'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
            $onlineSurveyQuestion->update($request->validated());
            $this->activityLogService->logUpdate($onlineSurveyQuestion);

            // Soru sayısını güncelle
            $survey = $onlineSurveyQuestion->onlineSurvey;
            $survey->update([
                'question_count' => $survey->questions()->count(),
            ]);

            return $this->success(new OnlineSurveyQuestionResource($onlineSurveyQuestion->fresh()), 'Soru başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Delete question.
     */
    public function deleteQuestion(OnlineSurveyQuestion $onlineSurveyQuestion): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.delete'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $survey = $onlineSurveyQuestion->onlineSurvey;
        $this->activityLogService->logDelete($onlineSurveyQuestion);
        $onlineSurveyQuestion->delete();

        // Soru sayısını güncelle
        $survey->update([
            'question_count' => $survey->questions()->count(),
        ]);

        return $this->success(null, 'Soru başarıyla silindi.');
    }

    /**
     * Submit survey response.
     */
    public function submitResponse(StoreOnlineSurveyResponseRequest $request, CreateOnlineSurveyResponseAction $action): JsonResponse
    {
        // Herkes yanıt verebilir (form validation içinden rol doğrulanır)

        try {
            $response = $action->execute($request->validated());

            return $this->success(new OnlineSurveyResponseResource($response), 'Anket cevabı başarıyla gönderildi.', 201);
        } catch (\Exception $e) {
            Log::warning('OnlineSurvey submitResponse failed', [
                'user_id' => auth()->id(),
                'online_survey_id' => $request->input('online_survey_id'),
                'message' => $e->getMessage(),
            ]);
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get survey statistics.
     */
    public function getStatistics(OnlineSurvey $onlineSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        try {
        $totalResponses = $onlineSurvey->getTotalResponses();
        $anonymousResponses = $onlineSurvey->responses()->where('is_anonymous', true)->count();
        $nonAnonymousResponses = $totalResponses - $anonymousResponses;

        // Cevaplayan türü bazlı istatistikler
        $byRespondentType = $onlineSurvey->responses()
            ->selectRaw('respondent_type, COUNT(*) as count')
            ->whereNotNull('respondent_type')
            ->groupBy('respondent_type')
            ->pluck('count', 'respondent_type');

        $responses = $onlineSurvey->responses()
            ->where('is_anonymous', false)
            ->get(['respondent_id', 'respondent_type']);

        $campusCounts = [];
        $educationLevelCounts = [];
        $campusEducationLevelCounts = [];

        // Basit ve güvenli yaklaşım: response başına kampüs/kademe çöz (FK yok, respondent_type ile ayrıştır)
        $campusNameCache = [];
        $educationLevelNameCache = [];
        foreach ($responses as $r) {
            $campusName = null;
            $educationLevelName = null;

            if ($r->respondent_type === 'guardian') {
                $student = Student::query()
                    ->with(['classroom.branch.educationLevel', 'classroom.campus', 'classroom.educationLevel'])
                    ->find($r->respondent_id);

                $campusName = $student?->classroom?->campus?->name
                    ?? $student?->classroom?->branch?->campus?->name;

                $educationLevelName = $student?->classroom?->educationLevel?->name
                    ?? $student?->classroom?->branch?->educationLevel?->name;
            } else {
                // teacher / staff
                // Bazı kurulumlarda user_campus_branch_assignments tablosu yok.
                // Bu yüzden users.campus_ids / users.education_level_ids JSON alanlarını kullanıyoruz.
                $u = User::query()->find($r->respondent_id);

                $campusId = is_array($u?->campus_ids) ? ($u->campus_ids[0] ?? null) : null;
                if ($campusId) {
                    $campusNameCache[$campusId] ??= Campus::query()->whereKey($campusId)->value('name');
                    $campusName = $campusNameCache[$campusId];
                }

                $educationLevelId = is_array($u?->education_level_ids) ? ($u->education_level_ids[0] ?? null) : null;
                if ($educationLevelId) {
                    $educationLevelNameCache[$educationLevelId] ??= EducationLevel::query()->whereKey($educationLevelId)->value('name');
                    $educationLevelName = $educationLevelNameCache[$educationLevelId];
                }
            }

            $campusName = $campusName ?: 'Bilinmiyor';
            $educationLevelName = $educationLevelName ?: 'Bilinmiyor';

            $campusCounts[$campusName] = ($campusCounts[$campusName] ?? 0) + 1;
            $educationLevelCounts[$educationLevelName] = ($educationLevelCounts[$educationLevelName] ?? 0) + 1;
            $campusEducationLevelCounts[$campusName] ??= [];
            $campusEducationLevelCounts[$campusName][$educationLevelName] = ($campusEducationLevelCounts[$campusName][$educationLevelName] ?? 0) + 1;
        }

        return $this->success([
            'total_responses' => $totalResponses,
            'anonymous_responses' => $anonymousResponses,
            'non_anonymous_responses' => $nonAnonymousResponses,
            'by_respondent_type' => $byRespondentType,
            'by_campus' => $campusCounts,
            'by_education_level' => $educationLevelCounts,
            'by_campus_education_level' => $campusEducationLevelCounts,
            'question_count' => $onlineSurvey->question_count,
        ], 'Anket istatistikleri başarıyla getirildi.');
        } catch (\Throwable $e) {
            Log::error('OnlineSurvey getStatistics failed', [
                'user_id' => auth()->id(),
                'online_survey_id' => $onlineSurvey->id,
                'message' => $e->getMessage(),
            ]);
            return $this->error('İstatistikler hazırlanırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get survey analysis (general/individual).
     */
    public function getAnalysis(OnlineSurvey $onlineSurvey): JsonResponse
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
             return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
        }

        $analysisType = request('type', 'general'); // general or individual

        if ($analysisType === 'general') {
            // Genel analiz: Tüm cevapların toplamı
            $responses = $onlineSurvey->responses()->get();
            $questions = $onlineSurvey->questions()->get();
            
            $analysis = [];
            foreach ($questions as $question) {
                $questionAnswers = [];
                foreach ($responses as $response) {
                    $answer = collect($response->answers)->firstWhere('question_id', $question->id);
                    if ($answer) {
                        $questionAnswers[] = $answer;
                    }
                }
                $analysis[] = [
                    'question_id' => $question->id,
                    'question' => $question->question,
                    'question_type' => $question->question_type,
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
            $responses = $onlineSurvey->responses()
                ->where('is_anonymous', false)
                ->with(['respondent'])
                ->get();

            $questions = $onlineSurvey->questions()->get()->keyBy('id');

            $individualAnalysis = $responses->map(function ($response) use ($questions) {
                $authoredAnswers = collect($response->answers ?? [])->map(function ($a) {
                    return is_array($a) ? $a : ['answer' => $a];
                });

                $answersDetailed = $authoredAnswers->map(function ($a) use ($questions) {
                    $qid = (int) ($a['question_id'] ?? 0);
                    $q = $questions->get($qid);
                    return [
                        'question_id' => $qid,
                        'question' => $q?->question,
                        'question_type' => $q?->question_type,
                        'answer' => $a['answer'] ?? null,
                        'selected_options' => $a['selected_options'] ?? null,
                    ];
                })->values();

                return [
                    'respondent_id' => $response->respondent_id,
                    'respondent' => $response->respondent ? [
                        'id' => $response->respondent->id,
                        'name' => $response->respondent->name,
                    ] : null,
                    'respondent_type' => $response->respondent_type,
                    'answers' => $response->answers,
                    'answers_detailed' => $answersDetailed,
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

    public function downloadStatisticsPdf(OnlineSurvey $onlineSurvey)
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
            abort(403, 'Bu işlem için yetkiniz bulunmamaktadır.');
        }

        $stats = $this->getStatistics($onlineSurvey)->getData(true);

        $pdf = Pdf::loadView('online-surveys.statistics', [
            'survey' => $onlineSurvey,
            'stats' => $stats['data'] ?? [],
            'generatedAt' => now()->format('d.m.Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('online_survey_statistics_' . $onlineSurvey->id . '.pdf');
    }

    public function downloadAnalysisPdf(OnlineSurvey $onlineSurvey)
    {
        $user = auth()->user();
        $canManage = $user?->is_superadmin
            || (method_exists($user, 'hasPermission') && $user->hasPermission('online_surveys.read'))
            || in_array($user?->role?->name, ['owner', 'Admin', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'], true);
            
        if (!$canManage) {
            abort(403, 'Bu işlem için yetkiniz bulunmamaktadır.');
        }

        $type = request('type', 'general');
        request()->merge(['type' => $type]);

        $analysisPayload = $this->getAnalysis($onlineSurvey)->getData(true);

        $pdf = Pdf::loadView('online-surveys.analysis', [
            'survey' => $onlineSurvey,
            'analysisType' => $type,
            'analysis' => $analysisPayload['data']['analysis'] ?? [],
            'generatedAt' => now()->format('d.m.Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('online_survey_analysis_' . $onlineSurvey->id . '_' . $type . '.pdf');
    }
}
