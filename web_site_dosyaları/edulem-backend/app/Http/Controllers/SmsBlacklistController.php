<?php

namespace App\Http\Controllers;

use App\Actions\CreateSmsBlacklistAction;
use App\Http\Requests\StoreSmsBlacklistRequest;
use App\Http\Resources\SmsBlacklistResource;
use App\Models\SmsBlacklist;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class SmsBlacklistController extends ApiController
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Display a listing of SMS blacklist entries.
     */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', SmsBlacklist::class);

        $query = SmsBlacklist::with(['creator']);

        // Filtreleme
        if (request()->has('phone')) {
            $query->where('phone', 'like', '%' . request('phone') . '%');
        }

        if (request()->has('type')) {
            $query->where('type', request('type'));
        }

        $blacklist = $query->latest('created_at')->paginate(request('per_page', 50));

        return $this->success([
            'blacklist' => SmsBlacklistResource::collection($blacklist),
            'pagination' => [
                'current_page' => $blacklist->currentPage(),
                'last_page' => $blacklist->lastPage(),
                'per_page' => $blacklist->perPage(),
                'total' => $blacklist->total(),
            ],
        ], 'Kara liste başarıyla listelendi.');
    }

    /**
     * Store a newly created blacklist entry.
     */
    public function store(StoreSmsBlacklistRequest $request, CreateSmsBlacklistAction $createAction): JsonResponse
    {
        Gate::authorize('create', SmsBlacklist::class);

        try {
            $blacklist = $createAction->execute($request->validated());
            return $this->success(new SmsBlacklistResource($blacklist), 'Kara listeye başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Display the specified blacklist entry.
     */
    public function show(SmsBlacklist $smsBlacklist): JsonResponse
    {
        Gate::authorize('view', $smsBlacklist);

        $smsBlacklist->load(['creator']);

        return $this->success(new SmsBlacklistResource($smsBlacklist));
    }

    /**
     * Remove the specified blacklist entry.
     */
    public function destroy(SmsBlacklist $smsBlacklist): JsonResponse
    {
        Gate::authorize('delete', $smsBlacklist);

        $this->activityLogService->logDelete($smsBlacklist);
        $smsBlacklist->delete();

        return $this->success(null, 'Kara listeden başarıyla çıkarıldı.');
    }

    /**
     * Check if a phone is blacklisted.
     */
    public function check(): JsonResponse
    {
        Gate::authorize('viewAny', SmsBlacklist::class);

        $request->validate([
            'phone' => ['required', 'string', 'regex:/^[0-9]{10,11}$/'],
        ]);

        $phone = request('phone');
        $tenantId = auth()->user()->tenant_id;

        $isBlacklisted = SmsBlacklist::isBlacklisted($phone, $tenantId);

        return $this->success([
            'phone' => $phone,
            'is_blacklisted' => $isBlacklisted,
        ], $isBlacklisted ? 'Telefon kara listede.' : 'Telefon kara listede değil.');
    }
}
