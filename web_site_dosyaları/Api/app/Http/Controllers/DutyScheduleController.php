<?php

namespace App\Http\Controllers;

use App\Actions\CreateDutyScheduleAction;
use App\Actions\UpdateDutyScheduleAction;
use App\Http\Requests\StoreDutyScheduleRequest;
use App\Http\Requests\UpdateDutyScheduleRequest;
use App\Http\Resources\DutyScheduleResource;
use App\Models\DutySchedule;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;

class DutyScheduleController extends ApiController
{
    protected ActivityLogService $activityLogService;

    private function isFounderRole(?string $roleName): bool
    {
        return in_array($roleName, ['owner'], true);
    }

    private function normalizeIds($value): array
    {
        $arr = is_array($value) ? $value : [];
        return array_values(array_filter(array_map('intval', $arr), static fn ($x) => $x > 0));
    }

    private function getAllowedScope(): array
    {
        $user = auth()->user();
        $roleName = $user && $user->role ? $user->role->name : null;

        if (! $user) {
            return [
                'is_unrestricted' => false,
                'campus_ids' => [],
                'education_level_ids' => [],
            ];
        }

        if ($user->is_superadmin || $this->isFounderRole($roleName)) {
            return [
                'is_unrestricted' => true,
                'campus_ids' => [],
                'education_level_ids' => [],
            ];
        }

        return [
            'is_unrestricted' => false,
            'campus_ids' => $this->normalizeIds($user->campus_ids ?? []),
            'education_level_ids' => $this->normalizeIds($user->education_level_ids ?? []),
        ];
    }

    private function enforceScopeForQuery($query): void
    {
        $scope = $this->getAllowedScope();
        if ($scope['is_unrestricted']) {
            return;
        }

        // Kapsam atanmamışsa veri göstermeyelim (owner/superadmin hariç)
        $allowedLevels = $scope['education_level_ids'];
        $allowedCampuses = $scope['campus_ids'];

        if (empty($allowedLevels) && empty($allowedCampuses)) {
            $query->whereRaw('1 = 0');
            return;
        }

        // En azından kademe kapsamı varsa onu zorunlu kılalım.
        if (! empty($allowedLevels)) {
            $query->whereIn('education_level_id', $allowedLevels);
        }

        // Kampüs kapsamı varsa daralt.
        if (! empty($allowedCampuses)) {
            $query->whereIn('campus_id', $allowedCampuses);
        }
    }

    private function assertPayloadScopeAllowed(array $data): ?JsonResponse
    {
        $scope = $this->getAllowedScope();
        if ($scope['is_unrestricted']) {
            return null;
        }

        $allowedLevels = $scope['education_level_ids'];
        $allowedCampuses = $scope['campus_ids'];

        if (empty($allowedLevels) && empty($allowedCampuses)) {
            return $this->error('Bu işlem için kapsam yetkiniz yok.', [], 403);
        }

        // Scoped kullanıcılar kampüs belirtmek zorunda (kullanıcıda kampüs kapsamı varsa)
        if (!empty($allowedCampuses)) {
            if (!array_key_exists('campus_id', $data) || $data['campus_id'] === null) {
                return $this->error('Kampüs seçimi zorunludur.', [], 422);
            }
        }

        // Scoped kullanıcılar kademe belirtmek zorunda (aksi halde scope'suz kayıt oluşup veri sızıntısı yaratabilir)
        if (!empty($allowedLevels)) {
            if (!array_key_exists('education_level_id', $data) || $data['education_level_id'] === null) {
                return $this->error('Kademe seçimi zorunludur.', [], 422);
            }
        }

        if (array_key_exists('education_level_id', $data) && $data['education_level_id'] !== null) {
            if (empty($allowedLevels) || ! in_array((int) $data['education_level_id'], $allowedLevels, true)) {
                return $this->error('Bu kademede işlem yapma yetkiniz yok.', [], 403);
            }
        }

        if (array_key_exists('campus_id', $data) && $data['campus_id'] !== null) {
            if (! empty($allowedCampuses) && ! in_array((int) $data['campus_id'], $allowedCampuses, true)) {
                return $this->error('Bu kampüste işlem yapma yetkiniz yok.', [], 403);
            }
        }

        return null;
    }

    private function assertModelScopeAllowed(DutySchedule $dutySchedule): ?JsonResponse
    {
        $scope = $this->getAllowedScope();
        if ($scope['is_unrestricted']) {
            return null;
        }

        $allowedLevels = $scope['education_level_ids'];
        $allowedCampuses = $scope['campus_ids'];

        if (! empty($allowedLevels) && $dutySchedule->education_level_id !== null) {
            if (! in_array((int) $dutySchedule->education_level_id, $allowedLevels, true)) {
                return $this->error('Bu kademenin nöbet programına erişim yetkiniz yok.', [], 403);
            }
        }

        if (! empty($allowedCampuses) && $dutySchedule->campus_id !== null) {
            if (! in_array((int) $dutySchedule->campus_id, $allowedCampuses, true)) {
                return $this->error('Bu kampüsün nöbet programına erişim yetkiniz yok.', [], 403);
            }
        }

        // Kullanıcının kapsamı var ama kayıt scope'suz ise, varsayılan olarak gizleyelim.
        if (! empty($allowedLevels) && $dutySchedule->education_level_id === null) {
            return $this->error('Bu nöbet kaydı için kademe bilgisi tanımlı değil.', [], 403);
        }

        return null;
    }

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of duty schedules.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', DutySchedule::class);

        // If migrations haven't been run on the server, these columns may not exist yet.
        // Avoid a hard 500 (unknown column) and return a clear message.
        $hasCampusId = Schema::hasColumn('duty_schedules', 'campus_id');
        $hasEducationLevelId = Schema::hasColumn('duty_schedules', 'education_level_id');

        if ((request()->filled('campus_id') && ! $hasCampusId) || (request()->filled('education_level_id') && ! $hasEducationLevelId)) {
            return $this->error(
                'Sunucu tarafında nöbet çizelgesi güncellemesi eksik görünüyor. Lütfen veritabanı migrations çalıştırın (duty_schedules campus_id / education_level_id).',
                [],
                500
            );
        }

        $query = DutySchedule::with(['user']);

        if ($hasCampusId || $hasEducationLevelId) {
            $this->enforceScopeForQuery($query);
        }

        if ($hasCampusId && request()->filled('campus_id')) {
            $query->where('campus_id', (int) request('campus_id'));
        }

        if ($hasEducationLevelId && request()->filled('education_level_id')) {
            $query->where('education_level_id', (int) request('education_level_id'));
        }

        // Filtreleme
        if (request()->has('user_id')) {
            $query->where('user_id', request('user_id'));
        }

        if (request()->has('day_of_week')) {
            $query->where('day_of_week', request('day_of_week'));
        }

        if (request()->has('is_active')) {
            $query->where('is_active', request('is_active'));
        }

        if (request('active_only')) {
            $query->active();
        }

        // Sıralama
        $sortBy = request('sort_by', 'day_of_week');
        $sortOrder = request('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder)
              ->orderBy('start_time', 'asc');

        $dutySchedules = $query->paginate(request('per_page', 50));

        $activeCountQuery = DutySchedule::query();
        $totalCountQuery = DutySchedule::query();
        if ($hasCampusId || $hasEducationLevelId) {
            $this->enforceScopeForQuery($activeCountQuery);
            $this->enforceScopeForQuery($totalCountQuery);
        }
        $activeCount = $activeCountQuery->where('is_active', true)->count();
        $totalCount = $totalCountQuery->count();

        return $this->success([
            'items' => DutyScheduleResource::collection($dutySchedules->items()),
            'pagination' => [
                'current_page' => $dutySchedules->currentPage(),
                'last_page' => $dutySchedules->lastPage(),
                'per_page' => $dutySchedules->perPage(),
                'total' => $dutySchedules->total(),
            ],
            'active_count' => $activeCount,
            'total_count' => $totalCount,
        ], 'Nöbet çizelgesi listelendi.');
    }

    /**
     * Store a newly created duty schedule in storage.
     */
    public function store(StoreDutyScheduleRequest $request, CreateDutyScheduleAction $createDutyScheduleAction): JsonResponse
    {
        Gate::authorize('create', DutySchedule::class);

        try {
            $validated = $request->validated();
            if ($denied = $this->assertPayloadScopeAllowed($validated)) {
                return $denied;
            }

            $dutySchedule = $createDutyScheduleAction->execute($validated);

            return $this->success(
                new DutyScheduleResource($dutySchedule),
                'Nöbet programı başarıyla oluşturuldu.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Nöbet programı oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 422);
        }
    }

    /**
     * Display the specified duty schedule.
     */
    public function show(DutySchedule $dutySchedule): JsonResponse
    {
        Gate::authorize('view', $dutySchedule);

        if ($denied = $this->assertModelScopeAllowed($dutySchedule)) {
            return $denied;
        }

        return $this->success(new DutyScheduleResource($dutySchedule->load('user')));
    }

    /**
     * Update the specified duty schedule in storage.
     */
    public function update(UpdateDutyScheduleRequest $request, DutySchedule $dutySchedule, UpdateDutyScheduleAction $updateDutyScheduleAction): JsonResponse
    {
        Gate::authorize('update', $dutySchedule);

        if ($denied = $this->assertModelScopeAllowed($dutySchedule)) {
            return $denied;
        }

        try {
            $validated = $request->validated();
            if ($denied = $this->assertPayloadScopeAllowed($validated)) {
                return $denied;
            }

            $updatedDutySchedule = $updateDutyScheduleAction->execute($dutySchedule, $validated);

            return $this->success(
                new DutyScheduleResource($updatedDutySchedule),
                'Nöbet programı başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Nöbet programı güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 422);
        }
    }

    /**
     * Remove the specified duty schedule from storage.
     */
    public function destroy(DutySchedule $dutySchedule): JsonResponse
    {
        Gate::authorize('delete', $dutySchedule);

        if ($denied = $this->assertModelScopeAllowed($dutySchedule)) {
            return $denied;
        }

        $this->activityLogService->logDelete($dutySchedule);
        $dutySchedule->delete();

        return $this->success(null, 'Nöbet programı başarıyla silindi.');
    }

    /**
     * Check for conflicts with other duty schedules.
     */
    public function checkConflict(StoreDutyScheduleRequest $request): JsonResponse
    {
        Gate::authorize('create', DutySchedule::class);

        try {
            $data = $request->validated();
            if ($denied = $this->assertPayloadScopeAllowed($data)) {
                return $denied;
            }
            
            $conflicts = DutySchedule::where('tenant_id', auth()->user()->tenant_id)
                ->where('user_id', $data['user_id'])
                ->where('day_of_week', $data['day_of_week'])
                ->when(array_key_exists('campus_id', $data) && $data['campus_id'] !== null, fn ($q) => $q->where('campus_id', (int) $data['campus_id']))
                ->when(array_key_exists('education_level_id', $data) && $data['education_level_id'] !== null, fn ($q) => $q->where('education_level_id', (int) $data['education_level_id']))
                ->where('is_active', true)
                ->get()
                ->filter(function ($existing) use ($data) {
                    $newStart = strtotime($data['start_time']);
                    $newEnd = strtotime($data['end_time']);
                    $existingStart = strtotime($existing->start_time);
                    $existingEnd = strtotime($existing->end_time);
                    
                    return !($newEnd <= $existingStart || $newStart >= $existingEnd);
                });

            if ($conflicts->isNotEmpty()) {
                return $this->success([
                    'has_conflict' => true,
                    'conflicts' => DutyScheduleResource::collection($conflicts),
                ], 'Nöbet programı çakışması tespit edildi.');
            }

            return $this->success([
                'has_conflict' => false,
                'conflicts' => [],
            ], 'Nöbet programı çakışması yok.');
        } catch (\Exception $e) {
            return $this->error('Çakışma kontrolü yapılırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Bulk clear duty schedules within the selected scope.
     */
    public function bulkClear(): JsonResponse
    {
        Gate::authorize('create', DutySchedule::class);

        $hasCampusId = Schema::hasColumn('duty_schedules', 'campus_id');
        $hasEducationLevelId = Schema::hasColumn('duty_schedules', 'education_level_id');

        $query = DutySchedule::query();

        if ($hasCampusId || $hasEducationLevelId) {
            $this->enforceScopeForQuery($query);
        }

        if ($hasCampusId && request()->filled('campus_id')) {
            $query->where('campus_id', (int) request('campus_id'));
        }

        if ($hasEducationLevelId && request()->filled('education_level_id')) {
            $query->where('education_level_id', (int) request('education_level_id'));
        }

        $count = $query->count();
        $query->delete();

        return $this->success([
            'deleted_count' => $count,
        ], "{$count} adet nöbet görevi başarıyla sıfırlandı.");
    }

    /**
     * Swap two duty schedules' assigned teachers.
     */
    public function swap(): JsonResponse
    {
        $validated = request()->validate([
            'schedule_id_1' => 'required|integer|exists:duty_schedules,id',
            'schedule_id_2' => 'required|integer|exists:duty_schedules,id',
        ]);

        $schedule1 = DutySchedule::with('user')->findOrFail($validated['schedule_id_1']);
        $schedule2 = DutySchedule::with('user')->findOrFail($validated['schedule_id_2']);

        Gate::authorize('update', $schedule1);
        Gate::authorize('update', $schedule2);

        if ($denied = $this->assertModelScopeAllowed($schedule1)) {
            return $denied;
        }
        if ($denied = $this->assertModelScopeAllowed($schedule2)) {
            return $denied;
        }

        $user1 = $schedule1->user_id;
        $user2 = $schedule2->user_id;

        $schedule1->update(['user_id' => $user2]);
        $schedule2->update(['user_id' => $user1]);

        return $this->success([
            'schedule_1' => new DutyScheduleResource($schedule1->fresh(['user'])),
            'schedule_2' => new DutyScheduleResource($schedule2->fresh(['user'])),
        ], 'Nöbetler başarıyla karşılıklı değiştirildi.');
    }
}
