<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Http\Requests\SuperAdmin\StoreTenantRequest;
use App\Http\Requests\SuperAdmin\UpdateTenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantController extends ApiController
{
    /**
     * Display a listing of tenants.
     */
    public function index(): JsonResponse
    {
        try {
            $tenants = Tenant::with(['users', 'currentSubscription'])
                ->withCount([
                    'users' => fn ($q) => $q->where('is_active', true),
                    'students' => fn ($q) => $q->where('is_active', true),
                ])
                ->orderBy('created_at', 'desc')
                ->paginate(20);

            return $this->success([
                'tenants' => TenantResource::collection($tenants),
                'pagination' => [
                    'current_page' => $tenants->currentPage(),
                    'last_page' => $tenants->lastPage(),
                    'per_page' => $tenants->perPage(),
                    'total' => $tenants->total(),
                ],
            ], 'Kurumlar başarıyla listelendi.');

        } catch (\Exception $e) {
            return $this->error('Kurumlar listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created tenant in storage.
     */
    public function store(StoreTenantRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request) {
                // 1. Kurum verisini hazırla
                $tenantData = [
                    'domain' => trim(strtolower($request->domain)),
                    'name' => trim($request->name),
                    'official_title' => $request->official_title ?: $request->name,
                    'authorized_person' => $request->authorized_person,
                    'authorized_phone' => $request->authorized_phone ?: $request->phone,
                    'authorized_email' => $request->authorized_email ?: $request->email,
                    'accounting_phone' => $request->accounting_phone,
                    'tax_office' => $request->tax_office,
                    'tax_number' => $request->tax_number,
                    'address' => $request->address,
                    'city' => $request->city,
                    'district' => $request->district,
                    'contract_amount' => $request->contract_amount ? (float) $request->contract_amount : 0.00,
                    'contract_start_date' => $request->contract_start_date,
                    'contract_end_date' => $request->contract_end_date,
                    'notes' => $request->notes,
                    'is_active' => $request->boolean('is_active', true),
                ];

                $tenant = Tenant::create($tenantData);

                // 2. Bu kurum için tüm standart rolleri (Müdür, Öğretmen, Rehberlik vb.) ve Kurum Sahibi rolünü oluştur
                $roles = \App\Services\TenantRoleService::seedRolesForTenant($tenant);
                $ownerRole = $roles['owner'] ?? \App\Models\Role::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'name' => 'owner'],
                    [
                        'display_name' => 'Kurum Sahibi',
                        'description' => 'Kurumun sahibi ve ana yöneticisi',
                        'is_system' => true,
                        'level' => 0,
                        'sort_order' => 0,
                    ]
                );

                // 3. İlk yönetici (admin) kullanıcısını oluştur
                $tcNo = preg_replace('/\D/', '', (string) $request->admin_tc_no);
                $adminEmail = $request->filled('admin_email') 
                    ? $request->admin_email 
                    : ($tcNo . '@' . $tenant->domain . '.edulem.com');

                $adminUser = User::create([
                    'tenant_id' => $tenant->id,
                    'tc_no' => $tcNo,
                    'name' => $request->admin_name,
                    'email' => $adminEmail,
                    'phone' => $request->admin_phone,
                    'password' => Hash::make($request->admin_password),
                    'role_id' => $ownerRole->id,
                    'is_active' => true,
                ]);

                return $this->success([
                    'tenant' => [
                        'id' => $tenant->id,
                        'name' => $tenant->name,
                        'domain' => $tenant->domain,
                        'is_active' => (bool) $tenant->is_active,
                    ],
                    'admin_user' => [
                        'id' => $adminUser->id,
                        'tc_no' => $adminUser->tc_no,
                        'name' => $adminUser->name,
                        'email' => $adminUser->email,
                    ]
                ], 'Kurum ve yönetici hesabı başarıyla oluşturuldu.');

            });
        } catch (\Exception $e) {
            return $this->error('Kurum oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified tenant.
     */
    public function show($id): JsonResponse
    {
        try {
            $tenantId = ($id instanceof Tenant) ? $id->id : (int) $id;

            $tenant = Tenant::withCount([
                    'users' => fn ($q) => $q->where('is_active', true),
                    'students' => fn ($q) => $q->where('is_active', true),
                ])
                ->find($tenantId);

            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            // Güvenli ilişkileri yükle
            try {
                $tenant->load(['users', 'payments', 'moduleLicenses.module']);
            } catch (\Throwable $relErr) {
                // İlişki yükleme hatası olursa da kurumu döndür
            }

            return $this->success([
                'tenant' => new TenantResource($tenant)
            ], 'Kurum bilgileri getirildi.');

        } catch (\Exception $e) {
            return $this->error('Kurum bilgileri alınırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update the specified tenant in storage.
     */
    public function update(UpdateTenantRequest $request, $id): JsonResponse
    {
        try {
            $tenantId = ($id instanceof Tenant) ? $id->id : (int) $id;
            $tenant = Tenant::find($tenantId);

            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            $tenantData = $request->only([
                'domain', 'name', 'official_title', 'phone', 'email',
                'authorized_person', 'authorized_phone', 'authorized_email',
                'accounting_phone', 'address', 'city', 'district', 'tax_office', 'tax_number',
                'contract_start_date', 'contract_end_date', 'contract_amount', 'notes',
            ]);

            if ($request->has('is_active')) {
                $tenantData['is_active'] = $request->boolean('is_active');
            }

            $tenant->update(array_filter($tenantData, fn($val) => $val !== null));

            return $this->success([
                'tenant' => new TenantResource($tenant)
            ], 'Kurum başarıyla güncellendi.');

        } catch (\Exception $e) {
            return $this->error('Kurum güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified tenant from storage.
     * SADECE PATRON (Super Admin) silebilir!
     */
    public function destroy($id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Yetkisiz İşlem: Kurum silme yetkisi sadece EduLem Kurucusu (Patron) hesabına aittir.', [], 403);
            }

            $tenantId = ($id instanceof Tenant) ? $id->id : (int) $id;
            $tenant = Tenant::find($tenantId);

            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            return DB::transaction(function () use ($tenant) {
                // Delete all users associated with tenant
                $tenant->users()->delete();
                
                // Delete all students associated with tenant
                $tenant->students()->delete();

                // Delete licenses & payments
                $tenant->moduleLicenses()->delete();
                $tenant->payments()->delete();

                // Delete tenant
                $tenant->delete();

                return $this->success([], 'Kurum ve ilişkili tüm veriler başarıyla silindi.');

            });
        } catch (\Exception $e) {
            return $this->error('Kurum silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Toggle tenant status (activate/deactivate)
     */
    public function toggleStatus($id): JsonResponse
    {
        try {
            $tenantId = ($id instanceof Tenant) ? $id->id : (int) $id;
            $tenant = Tenant::find($tenantId);

            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            $tenant->update(['is_active' => !$tenant->is_active]);

            $status = $tenant->is_active ? 'aktifleştirildi' : 'pasifleştirildi';

            return $this->success([
                'tenant' => new TenantResource($tenant)
            ], "Kurum başarıyla {$status}.");

        } catch (\Exception $e) {
            return $this->error('Kurum durumu değiştirilirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get tenant statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total_tenants' => Tenant::count(),
                'active_tenants' => Tenant::where('is_active', true)->count(),
                'inactive_tenants' => Tenant::where('is_active', false)->count(),
                'total_users' => User::where('is_active', true)->count(),
                'total_students' => \App\Models\Student::where('is_active', true)->count(),
                'total_students_all' => \App\Models\Student::count(),
                'recent_tenants' => Tenant::withCount([
                    'users' => fn ($q) => $q->where('is_active', true),
                    'students' => fn ($q) => $q->where('is_active', true),
                ])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get(),
            ];

            return $this->success($stats, 'İstatistikler başarıyla getirildi.');

        } catch (\Exception $e) {
            return $this->error('İstatistikler alınırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
