<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends ApiController
{
    /**
     * Get activity logs.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = ActivityLog::with(['user', 'impersonator', 'tenant']);

            // Tenant bazlı filtreleme (SuperAdmin hariç)
            if (!$user->isSuperAdmin()) {
                $query->where('tenant_id', $user->tenant_id);
            }

            // Action filtresi
            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            // Entity type filtresi
            if ($request->has('entity_type')) {
                $query->where('entity_type', $request->entity_type);
            }

            // Entity ID filtresi
            if ($request->has('entity_id')) {
                $query->where('entity_id', $request->entity_id);
            }

            // User ID filtresi
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            // Tarih aralığı filtresi
            if ($request->has('start_date')) {
                $query->whereDate('created_at', '>=', $request->start_date);
            }

            if ($request->has('end_date')) {
                $query->whereDate('created_at', '<=', $request->end_date);
            }

            $logs = $query->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 50));

            return $this->success([
                'logs' => $logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'action' => $log->action,
                        'entity_type' => $log->entity_type,
                        'entity_id' => $log->entity_id,
                        'user' => [
                            'id' => $log->user->id,
                            'name' => $log->user->name,
                            'email' => $log->user->email,
                        ],
                        'impersonator' => $log->impersonator ? [
                            'id' => $log->impersonator->id,
                            'name' => $log->impersonator->name,
                        ] : null,
                        'display_user' => $log->display_user,
                        'old_values' => $log->old_values,
                        'new_values' => $log->new_values,
                        'ip_address' => $log->ip_address,
                        'user_agent' => $log->user_agent,
                        'created_at' => $log->created_at->toDateTimeString(),
                    ];
                }),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                ],
            ], 'Activity loglar başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Activity loglar getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get activity log statistics.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $query = ActivityLog::query();

            // Tenant bazlı filtreleme (SuperAdmin hariç)
            if (!$user->isSuperAdmin()) {
                $query->where('tenant_id', $user->tenant_id);
            }

            // Tarih aralığı (varsayılan: son 30 gün)
            $startDate = $request->get('start_date', now()->subDays(30)->format('Y-m-d'));
            $endDate = $request->get('end_date', now()->format('Y-m-d'));

            $query->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

            $totalActions = $query->count();
            
            $byAction = ActivityLog::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->when(!$user->isSuperAdmin(), function ($q) use ($user) {
                    $q->where('tenant_id', $user->tenant_id);
                })
                ->selectRaw('action, COUNT(*) as count')
                ->groupBy('action')
                ->pluck('count', 'action')
                ->toArray();

            $byUser = ActivityLog::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->when(!$user->isSuperAdmin(), function ($q) use ($user) {
                    $q->where('tenant_id', $user->tenant_id);
                })
                ->with('user:id,name')
                ->selectRaw('user_id, COUNT(*) as count')
                ->groupBy('user_id')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->user?->name ?? 'Bilinmeyen' => $item->count];
                })
                ->toArray();

            $byEntityType = ActivityLog::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
                ->when(!$user->isSuperAdmin(), function ($q) use ($user) {
                    $q->where('tenant_id', $user->tenant_id);
                })
                ->selectRaw('entity_type, COUNT(*) as count')
                ->groupBy('entity_type')
                ->pluck('count', 'entity_type')
                ->toArray();

            $stats = [
                'total_actions' => $totalActions,
                'by_action' => $byAction,
                'by_user' => $byUser,
                'by_entity_type' => $byEntityType,
            ];

            return $this->success(['statistics' => $stats], 'İstatistikler başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('İstatistikler getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
