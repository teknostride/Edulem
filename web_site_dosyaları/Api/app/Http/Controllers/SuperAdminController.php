<?php

namespace App\Http\Controllers;

use App\Actions\CreateTenantAction;
use App\Actions\UpdateTenantAction;
use App\Http\Requests\StoreTenantRequest;
use App\Http\Requests\UpdateTenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\ActivityLog;
use App\Models\Tenant;
use App\Models\Payment;
use App\Models\Invoice;
use App\Models\User;
use App\Models\SaasRevenue;
use App\Models\SaasExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminController extends ApiController
{
    /**
     * Get all tenants.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function tenants(): JsonResponse
    {
        try {
            $tenants = Tenant::withCount(['users', 'students'])
                ->with(['currentSubscription', 'adminUser'])
                ->orderBy('created_at', 'desc')
                ->paginate(request('per_page', 15));

            return $this->success([
                'tenants' => TenantResource::collection($tenants->items()),
                'pagination' => [
                    'current_page' => $tenants->currentPage(),
                    'last_page' => $tenants->lastPage(),
                    'per_page' => $tenants->perPage(),
                    'total' => $tenants->total(),
                ],
            ], 'Tenantlar başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Tenantlar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Create a new tenant.
     *
     * @param  \App\Http\Requests\StoreTenantRequest  $request
     * @param  \App\Actions\CreateTenantAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function createTenant(StoreTenantRequest $request, CreateTenantAction $action): JsonResponse
    {
        try {
            $tenant = $action->execute($request->validated());

            return $this->success(
                ['tenant' => new TenantResource($tenant)],
                'Tenant başarıyla oluşturuldu.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Tenant oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update a tenant.
     *
     * @param  int  $id
     * @param  \App\Http\Requests\UpdateTenantRequest  $request
     * @param  \App\Actions\UpdateTenantAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateTenant(int $id, UpdateTenantRequest $request, UpdateTenantAction $action): JsonResponse
    {
        try {
            $tenant = Tenant::findOrFail($id);
            $tenant = $action->execute($tenant, $request->validated());

            return $this->success(
                ['tenant' => new TenantResource($tenant)],
                'Tenant başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Tenant güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Activate/Deactivate a tenant.
     *
     * @param  int  $id
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleTenantStatus(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        try {
            $tenant = Tenant::findOrFail($id);
            $tenant->update(['is_active' => $request->is_active]);

            return $this->success(
                ['tenant' => $tenant],
                $request->is_active ? 'Tenant aktif edildi.' : 'Tenant pasif edildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Tenant durumu değiştirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get a single tenant by ID.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function showTenant(int $id): JsonResponse
    {
        try {
            $tenant = Tenant::withCount(['users', 'students'])
                ->with(['currentSubscription', 'adminUser'])
                ->findOrFail($id);

            return $this->success(
                ['tenant' => new TenantResource($tenant)],
                'Tenant başarıyla getirildi.'
            );
        } catch (\Exception $e) {
            return $this->error('Tenant getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete a tenant.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteTenant(int $id): JsonResponse
    {
        try {
            $tenant = Tenant::findOrFail($id);
            
            // Owner rolünü bul
            $ownerRole = \App\Models\Role::where('tenant_id', $tenant->id)
                ->where('name', 'owner')
                ->first();
            
            // Admin kullanıcıyı (owner) hariç tut - sadece admin kullanıcı varsa silinebilir
            $query = $tenant->users();
            if ($ownerRole) {
                $query->where('role_id', '!=', $ownerRole->id);
            }
            $usersCount = $query->count();
            
            // Öğrenci kayıtları varsa silinemez
            $studentsCount = $tenant->students()->count();
            
            if ($usersCount > 0) {
                return $this->error('Bu kuruma ait kullanıcı kayıtları bulunduğu için silinemez. Önce kullanıcıları silin.', [], 422);
            }
            
            if ($studentsCount > 0) {
                return $this->error('Bu kuruma ait öğrenci kayıtları bulunduğu için silinemez. Önce öğrencileri silin.', [], 422);
            }

            // Tüm kullanıcıları sil (admin kullanıcı dahil - cascade delete ile otomatik silinir)
            $tenant->users()->delete();
            
            $tenant->delete();

            return $this->success(
                [],
                'Tenant başarıyla silindi.'
            );
        } catch (\Exception $e) {
            return $this->error('Tenant silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get system-wide activity logs.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function activityLogs(): JsonResponse
    {
        try {
            $logs = ActivityLog::with(['user', 'tenant', 'impersonator'])
                ->orderBy('created_at', 'desc')
                ->paginate(request('per_page', 50));

            return $this->success([
                'logs' => $logs->items(),
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
     * Get tenant statistics (revenue, receivables, top user).
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function tenantStats(int $id): JsonResponse
    {
        try {
            $tenant = Tenant::findOrFail($id);

            // Toplam gelir (ödemeler toplamı)
            $totalRevenue = Payment::where('tenant_id', $tenant->id)->sum('amount');

            // Alacaklar (ödenmemiş faturalar toplamı)
            $totalReceivables = Invoice::where('tenant_id', $tenant->id)
                ->where('status', '!=', 'paid')
                ->sum('amount');

            // En üst kullanıcı (general_manager rolüne sahip)
            $topUser = User::where('tenant_id', $tenant->id)
                ->whereHas('role', function ($query) {
                    $query->where('name', 'general_manager');
                })
                ->with('role:id,name,display_name')
                ->first();

            $topUserData = null;
            if ($topUser) {
                $topUserData = [
                    'id' => $topUser->id,
                    'name' => $topUser->name,
                    'email' => $topUser->email,
                    'role' => $topUser->role ? [
                        'id' => $topUser->role->id,
                        'name' => $topUser->role->name,
                        'display_name' => $topUser->role->display_name,
                    ] : null,
                ];
            }

            return $this->success([
                'stats' => [
                    'total_revenue' => (float) $totalRevenue,
                    'total_receivables' => (float) $totalReceivables,
                    'top_user' => $topUserData,
                ],
            ], 'Tenant istatistikleri başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Tenant istatistikleri getirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get SaaS revenues.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saasRevenues(): JsonResponse
    {
        try {
            $revenues = SaasRevenue::with('tenant')
                ->orderBy('revenue_date', 'desc')
                ->paginate(request('per_page', 15));

            return $this->success([
                'revenues' => $revenues->items(),
                'pagination' => [
                    'current_page' => $revenues->currentPage(),
                    'last_page' => $revenues->lastPage(),
                    'per_page' => $revenues->perPage(),
                    'total' => $revenues->total(),
                ],
            ], 'SaaS gelirleri başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('SaaS gelirleri listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get SaaS expenses.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saasExpenses(): JsonResponse
    {
        try {
            $expenses = SaasExpense::with('tenant')
                ->orderBy('expense_date', 'desc')
                ->paginate(request('per_page', 15));

            return $this->success([
                'expenses' => $expenses->items(),
                'pagination' => [
                    'current_page' => $expenses->currentPage(),
                    'last_page' => $expenses->lastPage(),
                    'per_page' => $expenses->perPage(),
                    'total' => $expenses->total(),
                ],
            ], 'SaaS giderleri başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('SaaS giderleri listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
