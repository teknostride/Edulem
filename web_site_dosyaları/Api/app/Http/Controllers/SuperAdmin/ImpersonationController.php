<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\SaasAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a school (Okula Canlı Destek Sızma Girişi).
     * Sadece Patron (super_admin) ve Teknik Destek (technical_support) yapabilir.
     */
    public function impersonate(Request $request, int $tenantId): JsonResponse
    {
        $staff = auth()->user();

        if (!$staff->canImpersonate()) {
            return response()->json([
                'status' => false,
                'message' => 'Bu işlem için Canlı Destek / Teknik Destek yetkisine sahip olmalısınız.',
            ], 403);
        }

        $tenant = Tenant::find($tenantId);
        if (!$tenant) {
            return response()->json([
                'status' => false,
                'message' => 'Okul (kurum) bulunamadı.',
            ], 404);
        }

        // Okul bünyesindeki bir yönetici kullanıcıyı bul (role_id admin/owner/manager veya ilk aktif personel)
        $targetUser = User::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->whereHas('role', function ($query) {
                $query->whereIn('name', ['owner', 'admin', 'Admin', 'Müdür', 'Genel Müdür']);
            })
            ->first();

        // Eğer belirtilen rollerde bulunamazsa okulun herhangi bir aktif kullanıcısını al
        if (!$targetUser) {
            $targetUser = User::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->first();
        }

        if (!$targetUser) {
            return response()->json([
                'status' => false,
                'message' => 'Bu okula ait giriş yapılabilecek aktif bir kullanıcı hesabı bulunamadı.',
            ], 422);
        }

        // 2 saatlik geçici canlı destek token'ı üret
        $token = $targetUser->createToken(
            'support_impersonation_by_' . $staff->id,
            ['*'],
            now()->addHours(2)
        )->plainTextToken;

        // SaaS Denetim Günlüğü (Audit Log) kaydet
        SaasAuditLog::create([
            'user_id' => $staff->id,
            'action' => 'impersonate_tenant',
            'target_type' => 'tenant',
            'target_id' => $tenant->id,
            'details' => [
                'tenant_name' => $tenant->name,
                'impersonated_user_id' => $targetUser->id,
                'impersonated_user_name' => $targetUser->name ?? ($targetUser->first_name . ' ' . $targetUser->last_name),
                'impersonated_user_email' => $targetUser->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'status' => true,
            'message' => "{$tenant->name} okuluna canlı destek oturumu başlatıldı.",
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $targetUser->id,
                    'name' => $targetUser->name ?? ($targetUser->first_name . ' ' . $targetUser->last_name),
                    'email' => $targetUser->email,
                    'role' => $targetUser->role?->name ?? 'Yönetici',
                    'tenant_id' => $targetUser->tenant_id,
                ],
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                    'domain' => $tenant->domain,
                ],
                'impersonator' => [
                    'id' => $staff->id,
                    'name' => $staff->name ?? ($staff->first_name . ' ' . $staff->last_name),
                    'email' => $staff->email,
                    'role' => $staff->saas_role ?? 'super_admin',
                ],
            ],
        ]);
    }
}
