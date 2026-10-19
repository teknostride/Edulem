<?php

namespace App\Http\Controllers;

use App\Actions\CreateClassroomAction;
use App\Actions\UpdateClassroomAction;
use App\Http\Requests\StoreClassroomRequest;
use App\Http\Requests\UpdateClassroomRequest;
use App\Http\Resources\ClassroomResource;
use App\Models\Classroom;
use App\Models\EducationLevel;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class ClassroomController extends ApiController
{
    protected ActivityLogService $activityLogService;

    private function isScopedManagerRole(?string $roleName): bool
    {
        return in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true);
    }

    private function scopedCampusAndLevelIds($user): array
    {
        return [
            'campus_ids' => array_filter(array_map('intval', (array) ($user->campus_ids ?? []))),
            'education_level_ids' => array_filter(array_map('intval', (array) ($user->education_level_ids ?? []))),
        ];
    }

    private function classroomInScope(Classroom $classroom, array $campusIds, array $educationLevelIds): bool
    {
        $classroom->loadMissing('educationLevel');
        $campusOk = empty($campusIds) || ($classroom->educationLevel && in_array((int) $classroom->educationLevel->campus_id, $campusIds, true));
        $levelOk = empty($educationLevelIds) || in_array((int) $classroom->grade_level, $educationLevelIds, true);
        return $campusOk && $levelOk;
    }

    private function educationLevelInScope(int $educationLevelId, array $campusIds, array $educationLevelIds): bool
    {
        $level = \App\Models\EducationLevel::query()->find($educationLevelId);
        if (! $level) {
            return false;
        }

        $campusOk = empty($campusIds) || in_array((int) $level->campus_id, $campusIds, true);
        $levelOk = empty($educationLevelIds) || in_array((int) $educationLevelId, $educationLevelIds, true);
        return $campusOk && $levelOk;
    }

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of the current user's allowed classrooms.
     */
    public function userClassrooms(): JsonResponse
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return $this->error('Kullanıcı giriş yapmamış.', [], 401);
            }

            $query = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->with([
                    'teacher',
                    'campus',
                    'educationLevel',
                    'branch.campus',
                    'educationLevel.campus',
                ])
                ->withCount('students')
                ->where('tenant_id', $user->tenant_id);

            // Müdür / Müdür Yardımcısı / Öğrenci İşleri / Rehberlik: Sadece atandığı kampüs ve kademelerdeki sınıfları
            $roleName = $user->role ? $user->role->name : null;
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true)) {
                $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
                if (! empty($campusIds) || ! empty($educationLevelIds)) {
                    $query->where(function ($q) use ($campusIds, $educationLevelIds) {
                        if (!empty($campusIds)) {
                            $q->where(function ($sq) use ($campusIds) {
                                $sq->whereHas('educationLevel', function ($qEl) use ($campusIds) {
                                    $qEl->whereIn('campus_id', $campusIds);
                                })->orWhereHas('campus', function ($qc) use ($campusIds) {
                                    $qc->whereIn('id', $campusIds);
                                })->orWhereIn('campus_id', $campusIds);
                            });
                        }
                        if (!empty($educationLevelIds)) {
                            $q->where(function ($sq) use ($educationLevelIds) {
                                $sq->whereIn('education_level_id', $educationLevelIds)
                                    ->orWhereIn('grade_level', $educationLevelIds);
                            });
                        }
                    });
                }
            }

            $classrooms = $query->get();

            return $this->success([
                'classrooms' => $classrooms,
            ], 'Kullanıcı sınıfları başarıyla listelendi.');
        } catch (\Exception $e) {
            \Log::error('ClassroomController::userClassrooms error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Sınıflar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
    public function index(): JsonResponse
    {
        try {
            $user = auth()->user();
            if (!$user) {
                return $this->error('Kullanıcı giriş yapmamış.', [], 401);
            }

            $isSeasonRequest = request()->has('season_id') && request('season_id') !== '';
            if ($isSeasonRequest) {
                $query = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                      ->where('season_id', request('season_id'));
            } else {
                $activeSeasonId = $this->getCurrentSeasonId();
                if ($activeSeasonId) {
                    $hasSeasonClassrooms = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                        ->where('tenant_id', $user->tenant_id)
                        ->where('season_id', $activeSeasonId)
                        ->exists();
                    if ($hasSeasonClassrooms) {
                        $query = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                            ->where('season_id', $activeSeasonId);
                    } else {
                        $query = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class);
                    }
                } else {
                    $query = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class);
                }
            }

            $query->with([
                    'teacher',
                    'campus',
                    'educationLevel',
                    'branch.campus',
                    'educationLevel.campus',
                ])
                ->withCount('students')
                ->where('tenant_id', $user->tenant_id);

            // ─── ROL TABANLI KAPSAM FİLTRESİ ──────────────────────────────────────
            // Sınıf verisinde education_level_id ve campus_id NULL olabileceğinden
            // kampüs/kademe erişimi grade_level → education_levels.campus_id üzerinden çözümlenir.
            $roleName = $user->role ? $user->role->name : null;
            $isScopedManager = in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true);

            if ($isScopedManager) {
                $scopeCampusIds        = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                $scopeEducationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));

                // Kampüs kısıtlaması
                if (! empty($scopeCampusIds)) {
                    // grade_level üzerinden education_levels.campus_id join
                    $elIdsForCampus = \App\Models\EducationLevel::query()
                        ->whereIn('campus_id', $scopeCampusIds)
                        ->pluck('id')
                        ->map(fn ($id) => (string) $id)
                        ->toArray();

                    $query->where(function ($q) use ($scopeCampusIds, $elIdsForCampus) {
                        $q->whereIn('grade_level', $elIdsForCampus) // grade_level = el.id (string)
                          ->orWhereIn('campus_id', $scopeCampusIds) // doğrudan campus_id varsa
                          ->orWhereHas('educationLevel', fn ($qEl) => $qEl->whereIn('campus_id', $scopeCampusIds))
                          ->orWhereHas('branch', fn ($qBranch) => $qBranch->whereIn('campus_id', $scopeCampusIds));
                    });
                }

                // Kademe kısıtlaması — grade_level string ID + kod eşleşmesiyle
                if (! empty($scopeEducationLevelIds)) {
                    $elCodes = \App\Models\EducationLevel::query()
                        ->whereIn('id', $scopeEducationLevelIds)
                        ->pluck('code')->filter()->values()->toArray();

                    $query->where(function ($q) use ($scopeEducationLevelIds, $elCodes) {
                        $q->whereIn('education_level_id', $scopeEducationLevelIds)
                          ->orWhereIn('grade_level', array_map('strval', $scopeEducationLevelIds));
                        foreach ($elCodes as $code) {
                            $q->orWhere('grade_level', $code);
                        }
                        $q->orWhereHas('branch', fn ($qBranch) => $qBranch->whereIn('education_level_id', $scopeEducationLevelIds));
                    });
                }
            }

            // ─── BRANCH ID FİLTRESİ ────────────────────────────────────────────────
            if (request()->has('branch_id') && request('branch_id')) {
                $query->where('branch_id', request('branch_id'));
            }

            // ─── KAMPÜS FİLTRESİ (request'ten) ────────────────────────────────────
            // Sınıfların grade_level alanı = education_level.id (string).
            // Bu yüzden kampüs eşleşmesi grade_level → education_levels.campus_id üzerinden yapılır.
            $campusId = request()->input('campus_id');
            if ($campusId !== null && $campusId !== '') {
                $campusId = (int) $campusId;

                // Bu kampüse ait tüm education level ID'lerini al
                $elIdsForRequestCampus = \App\Models\EducationLevel::query()
                    ->where('campus_id', $campusId)
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->toArray();

                $query->where(function ($q) use ($campusId, $elIdsForRequestCampus) {
                    // grade_level ile kampüs eşleşmesi (legacy veri – ana yol)
                    $q->whereIn('grade_level', $elIdsForRequestCampus)
                      // ya da doğrudan campus_id varsa
                      ->orWhere('campus_id', $campusId)
                      // ya da education_level_id üzerinden
                      ->orWhereHas('educationLevel', fn ($qEl) => $qEl->where('campus_id', $campusId))
                      // ya da branch üzerinden
                      ->orWhereHas('branch', fn ($qBranch) => $qBranch->where('campus_id', $campusId));
                });
            }

            // ─── KADEME FİLTRESİ (request'ten) ────────────────────────────────────
            $educationLevelId = request()->input('education_level_id');
            if ($educationLevelId !== null && $educationLevelId !== '') {
                $educationLevelIdInt = (int) $educationLevelId;
                $educationLevelCode  = \App\Models\EducationLevel::query()
                    ->whereKey($educationLevelIdInt)
                    ->value('code');

                $query->where(function ($q) use ($educationLevelIdInt, $educationLevelCode) {
                    $q->where('education_level_id', $educationLevelIdInt)
                      ->orWhere('grade_level', (string) $educationLevelIdInt) // grade_level = '5' gibi
                      ->orWhereHas('branch', fn ($qBranch) => $qBranch->where('education_level_id', $educationLevelIdInt));

                    if ($educationLevelCode !== null && $educationLevelCode !== '') {
                        $q->orWhere('grade_level', (string) $educationLevelCode); // kod bazlı eşleşme
                    }
                });
            }

            $activeCount = (clone $query)->where('is_active', true)->count();
            $totalCount = (clone $query)->count();

            // Hiyerarşik sıralama: Önce kademe (grade_level), sonra sınıf ismi (name)
            $classrooms = $query
                ->orderBy('grade_level', 'asc')
                ->orderBy('name', 'asc')
                ->paginate(request('per_page', 100));

            // Direkt model attributes'ı dönür (resource wrapping olmaksızın)
            $classroomArray = $classrooms->items();

            return $this->success([
                'classrooms' => $classroomArray, // Zaten array of Models
                'pagination' => [
                    'current_page' => $classrooms->currentPage(),
                    'last_page' => $classrooms->lastPage(),
                    'per_page' => $classrooms->perPage(),
                    'total' => $classrooms->total(),
                ],
                'active_count' => $activeCount,
                'total_count' => $totalCount,
            ], 'Sınıflar başarıyla listelendi.');
        } catch (\Exception $e) {
            \Log::error('ClassroomController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Sınıflar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created classroom in storage.
     */
    public function store(StoreClassroomRequest $request, CreateClassroomAction $createClassroomAction): JsonResponse
    {
        Gate::authorize('create', Classroom::class);

        $validated = $request->validated();
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if ($this->isScopedManagerRole($roleName)) {
            $scoped = $this->scopedCampusAndLevelIds($user);
            $targetEducationLevelId = (int) ($validated['grade_level'] ?? 0);
            if ($targetEducationLevelId <= 0 || ! $this->educationLevelInScope($targetEducationLevelId, $scoped['campus_ids'], $scoped['education_level_ids'])) {
                return $this->error('Bu kampüs/kademede sınıf oluşturma yetkiniz yok.', [], 403);
            }
        }

        $classroom = $createClassroomAction->execute($validated);

        return $this->success(new ClassroomResource($classroom), 'Sınıf başarıyla oluşturuldu.', 201);
    }

    /**
     * Display the specified classroom.
     */
    public function show($id): JsonResponse
    {
        $classroom = Classroom::withoutGlobalScope(\App\Scopes\TenantScope::class)->find($id);
        
        if (!$classroom) {
            return $this->error('Sınıf bulunamadı', [], 404);
        }

        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if ($this->isScopedManagerRole($roleName)) {
            $scoped = $this->scopedCampusAndLevelIds($user);
            if (! $this->classroomInScope($classroom, $scoped['campus_ids'], $scoped['education_level_ids'])) {
                return $this->error('Bu sınıfa erişim yetkiniz yok.', [], 403);
            }
        }

        Gate::authorize('view', $classroom);

        return $this->success(new ClassroomResource($classroom->load([
            'teacher',
            'students' => function ($q) {
                $q->where('is_active', true);
            },
            'schedules'
        ])));
    }

    /**
     * Update the specified classroom in storage.
     */
    public function update(UpdateClassroomRequest $request, $id, UpdateClassroomAction $updateClassroomAction): JsonResponse
    {
        $classroom = Classroom::withoutGlobalScope(\App\Scopes\TenantScope::class)->find($id);
        
        if (!$classroom) {
            return $this->error('Sınıf bulunamadı', [], 404);
        }

        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if ($this->isScopedManagerRole($roleName)) {
            $scoped = $this->scopedCampusAndLevelIds($user);
            if (! $this->classroomInScope($classroom, $scoped['campus_ids'], $scoped['education_level_ids'])) {
                return $this->error('Bu sınıfı güncelleme yetkiniz yok.', [], 403);
            }

            $validated = $request->validated();
            if (array_key_exists('grade_level', $validated)) {
                $targetEducationLevelId = (int) $validated['grade_level'];
                if (! $this->educationLevelInScope($targetEducationLevelId, $scoped['campus_ids'], $scoped['education_level_ids'])) {
                    return $this->error('Bu kampüs/kademeye sınıf taşıma yetkiniz yok.', [], 403);
                }
            }
        }

        Gate::authorize('update', $classroom);

        $updatedClassroom = $updateClassroomAction->execute($classroom, $request->validated());

        return $this->success(new ClassroomResource($updatedClassroom), 'Sınıf başarıyla güncellendi.');
    }

    /**
     * Remove the specified classroom from storage.
     */
    public function destroy($id): JsonResponse
    {
        // Route binding'in global scope problem'ini bypass et - ID'den direkt query yap
        $classroom = Classroom::withoutGlobalScope(\App\Scopes\TenantScope::class)->find($id);
        
        if (!$classroom) {
            return $this->error('Sınıf bulunamadı', [], 404);
        }

        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;
        if ($this->isScopedManagerRole($roleName)) {
            $scoped = $this->scopedCampusAndLevelIds($user);
            if (! $this->classroomInScope($classroom, $scoped['campus_ids'], $scoped['education_level_ids'])) {
                return $this->error('Bu sınıfı silme yetkiniz yok.', [], 403);
            }
        }

        $classroomId = $classroom->id;
        
        \Log::info('ClassroomController::destroy - START', [
            'classroom_id' => $classroomId,
            'classroom_exists_before' => Classroom::find($classroomId) ? 'YES' : 'NO',
        ]);
        
        // SuperAdmin and Owner can delete
        if (!($user->is_superadmin || ($user->role && $user->role->name === 'owner'))) {
            // For other roles, check policy
            try {
                Gate::authorize('delete', $classroom);
            } catch (\Exception $e) {
                \Log::error('ClassroomController::destroy - Gate::authorize FAILED', [
                    'error' => $e->getMessage(),
                    'user_id' => $user->id,
                    'classroom_id' => $classroom->id,
                ]);
                return $this->error('Bu işlem için yetkiniz bulunmamaktadır.', [], 403);
            }
        }

        // Sınıfta öğrenci varsa silme işlemini engelle
        if ($classroom->students()->count() > 0) {
            return $this->error('Bu sınıfta öğrenci bulunduğu için silinemez. Önce öğrencileri başka bir sınıfa taşıyın.', [], 422);
        }

        $this->activityLogService->logDelete($classroom);
        
        $deleted = $classroom->delete();
        
        \Log::info('ClassroomController::destroy - DELETE RESULT', [
            'classroom_id' => $classroomId,
            'delete_returned' => $deleted ? 'TRUE' : 'FALSE',
            'classroom_exists_after' => Classroom::find($classroomId) ? 'YES' : 'NO',
        ]);

        return $this->success(null, 'Sınıf başarıyla silindi.');
    }

    public function bulkCopyFromSeason(\Illuminate\Http\Request $request): JsonResponse
    {
        $user = $request->user();
        $sourceSeasonId = $request->input('source_season_id');

        if (!$sourceSeasonId) {
            return $this->error('Kaynak sezon zorunludur.', [], 422);
        }

        // Aktif veya yapılandırma sezonunu bul
        $targetSeasonId = $this->getCurrentSeasonId();

        if (!$targetSeasonId) {
            return $this->error('Aktif bir sezon bulunamadı.', [], 422);
        }

        if ((int)$sourceSeasonId === (int)$targetSeasonId) {
            return $this->error('Aynı sezon içerisinden kopyalama yapılamaz.', [], 422);
        }

        $sourceClassrooms = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('season_id', $sourceSeasonId)
            ->where('tenant_id', $user->tenant_id)
            ->get();

        // Hedef sezonun kademelerini alalım
        $targetLevels = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('season_id', $targetSeasonId)
            ->get();

        $count = 0;
        foreach ($sourceClassrooms as $source) {
            // Aynı isimde sınıf hedef sezonda var mı?
            $exists = Classroom::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                ->where('name', $source->name)
                ->where('season_id', $targetSeasonId)
                ->exists();

            if ($exists) continue;

            $new = $source->replicate(['students_count']);
            $new->season_id = $targetSeasonId;

            // Kademeyi isme göre eşleştir
            $sourceLevel = \App\Models\EducationLevel::withoutGlobalScope(\App\Scopes\SeasonScope::class)->find($source->education_level_id);
            if ($sourceLevel) {
                $matchingLevel = $targetLevels->first(fn($l) => $l->name === $sourceLevel->name);
                if ($matchingLevel) {
                    $new->education_level_id = $matchingLevel->id;
                    // grade_level alanını da ID olarak tutuyorsak güncelle
                    $new->grade_level = (string)$matchingLevel->id;
                }
            }

            $new->save();
            $count++;
        }

        return $this->success(null, "$count sınıf başarıyla yeni sezona aktarıldı.");
    }
}
