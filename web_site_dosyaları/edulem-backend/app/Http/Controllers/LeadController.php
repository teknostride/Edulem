<?php

namespace App\Http\Controllers;

use App\Actions\CreateLeadAction;
use App\Actions\UpdateLeadAction;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class LeadController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of leads.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Lead::class);

        $query = Lead::with(['assignedUser', 'appointments']);

        // Filtreleme
        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('assigned_to')) {
            $query->where('assigned_to', request('assigned_to'));
        }

        if (request()->has('source')) {
            $query->where('source', request('source'));
        }

        if (request()->has('search')) {
            $search = request('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Row-level security: Atanan kullanıcı sadece kendi lead'lerini görür
        $user = auth()->user();
        $role = $user->role ?? null;
        if ($role && $role->name !== 'general_manager' && !$user->isSuperAdmin()) {
            // Genel müdür değilse, sadece kendi atanan lead'lerini görür
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to', $user->id)
                    ->orWhereNull('assigned_to'); // Atanmamış lead'ler
            });
        }

        // Sıralama
        $query->latest('created_at');

        $leads = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Lead::count(),
            'new' => Lead::where('status', 'new')->count(),
            'contacted' => Lead::where('status', 'contacted')->count(),
            'qualified' => Lead::where('status', 'qualified')->count(),
            'converted' => Lead::where('status', 'converted')->count(),
            'lost' => Lead::where('status', 'lost')->count(),
        ];

        return $this->success([
            'leads' => LeadResource::collection($leads),
            'pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
            'statistics' => $stats,
        ], 'Lead kayıtları başarıyla listelendi.');
    }

    /**
     * Store a newly created lead in storage.
     */
    public function store(StoreLeadRequest $request, CreateLeadAction $createLeadAction): JsonResponse
    {
        Gate::authorize('create', Lead::class);

        try {
            $lead = $createLeadAction->execute($request->validated());
            return $this->success(new LeadResource($lead), 'Lead başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Lead oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified lead.
     */
    public function show(Lead $lead): JsonResponse
    {
        Gate::authorize('view', $lead);

        return $this->success(new LeadResource($lead->load(['assignedUser', 'appointments'])), 'Lead başarıyla getirildi.');
    }

    /**
     * Update the specified lead in storage.
     */
    public function update(UpdateLeadRequest $request, Lead $lead, UpdateLeadAction $updateLeadAction): JsonResponse
    {
        Gate::authorize('update', $lead);

        try {
            $updatedLead = $updateLeadAction->execute($lead, $request->validated());
            return $this->success(new LeadResource($updatedLead), 'Lead başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Lead güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified lead from storage.
     */
    public function destroy(Lead $lead): JsonResponse
    {
        Gate::authorize('delete', $lead);

        try {
            $this->activityLogService->logDelete($lead);
            $lead->delete();
            return $this->success([], 'Lead başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Lead silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
