<?php

namespace App\Http\Controllers;

use App\Actions\CreateSubscriptionAction;
use App\Actions\UpdateSubscriptionAction;
use App\Http\Requests\StoreSubscriptionRequest;
use App\Http\Requests\UpdateSubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\Subscription;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class SubscriptionController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of subscriptions.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Subscription::class);

        $query = Subscription::with(['package', 'modules']);

        // Filtreleme
        if (request()->has('status')) {
            $query->where('status', request('status'));
        }

        if (request()->has('package_id')) {
            $query->where('package_id', request('package_id'));
        }

        if (request()->has('start_date_from')) {
            $query->where('start_date', '>=', request('start_date_from'));
        }

        if (request()->has('start_date_to')) {
            $query->where('start_date', '<=', request('start_date_to'));
        }

        // Sıralama
        $query->latest('start_date')->latest('created_at');

        $subscriptions = $query->paginate(request('per_page', 50));

        // İstatistikler
        $stats = [
            'total' => Subscription::count(),
            'active' => Subscription::where('status', 'active')->count(),
            'suspended' => Subscription::where('status', 'suspended')->count(),
            'cancelled' => Subscription::where('status', 'cancelled')->count(),
            'expired' => Subscription::where('status', 'expired')->count(),
        ];

        return $this->success([
            'subscriptions' => SubscriptionResource::collection($subscriptions),
            'pagination' => [
                'current_page' => $subscriptions->currentPage(),
                'last_page' => $subscriptions->lastPage(),
                'per_page' => $subscriptions->perPage(),
                'total' => $subscriptions->total(),
            ],
            'statistics' => $stats,
        ], 'Abonelikler başarıyla listelendi.');
    }

    /**
     * Store a newly created subscription in storage.
     */
    public function store(StoreSubscriptionRequest $request, CreateSubscriptionAction $createSubscriptionAction): JsonResponse
    {
        Gate::authorize('create', Subscription::class);

        try {
            $subscription = $createSubscriptionAction->execute($request->validated());
            return $this->success(new SubscriptionResource($subscription), 'Abonelik başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Abonelik oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified subscription.
     */
    public function show(Subscription $subscription): JsonResponse
    {
        Gate::authorize('view', $subscription);

        return $this->success(new SubscriptionResource($subscription->load(['package', 'modules', 'tenant'])), 'Abonelik başarıyla getirildi.');
    }

    /**
     * Update the specified subscription in storage.
     */
    public function update(UpdateSubscriptionRequest $request, Subscription $subscription, UpdateSubscriptionAction $updateSubscriptionAction): JsonResponse
    {
        Gate::authorize('update', $subscription);

        try {
            $updatedSubscription = $updateSubscriptionAction->execute($subscription, $request->validated());
            return $this->success(new SubscriptionResource($updatedSubscription), 'Abonelik başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Abonelik güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified subscription from storage.
     */
    public function destroy(Subscription $subscription): JsonResponse
    {
        Gate::authorize('delete', $subscription);

        try {
            $this->activityLogService->logDelete($subscription);
            $subscription->delete();
            return $this->success([], 'Abonelik başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Abonelik silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get current subscription for tenant.
     */
    public function current(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $subscription = Subscription::with(['package', 'modules'])
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->latest('start_date')
            ->first();

        if (!$subscription) {
            return $this->error('Aktif abonelik bulunamadı.', [], 404);
        }

        return $this->success(new SubscriptionResource($subscription), 'Mevcut abonelik başarıyla getirildi.');
    }
}
