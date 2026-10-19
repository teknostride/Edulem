<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Models\SaasModule;
use App\Models\Tenant;
use App\Models\TenantModuleLicense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantLicenseController extends ApiController
{
    /**
     * Get all modules with their license status for a specific school.
     */
    public function getLicenses(int $tenantId): JsonResponse
    {
        try {
            $tenant = Tenant::find($tenantId);
            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            $allModules = SaasModule::orderBy('sort_order')->get();
            $existingLicenses = TenantModuleLicense::where('tenant_id', $tenantId)->get()->keyBy('module_code');

            $result = $allModules->map(function ($mod) use ($existingLicenses) {
                $lic = $existingLicenses->get($mod->code);
                return [
                    'module_id' => $mod->id,
                    'code' => $mod->code,
                    'name' => $mod->name,
                    'description' => $mod->description,
                    'icon' => $mod->icon,
                    'badge_color' => $mod->badge_color,
                    'catalog_annual_price' => (float) $mod->annual_price,
                    'is_licensed' => $lic ? (bool) $lic->is_active : false,
                    'agreed_price' => $lic ? (float) $lic->agreed_price : (float) $mod->annual_price,
                    'starts_at' => $lic ? $lic->starts_at?->format('Y-m-d') : null,
                    'expires_at' => $lic ? $lic->expires_at?->format('Y-m-d') : null,
                ];
            });

            return $this->success([
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'domain' => $tenant->domain,
                    'contract_amount' => (float) $tenant->contract_amount,
                ],
                'modules' => $result,
            ], 'Okul lisansları başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Lisanslar getirilirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Toggle or update a module license for a school.
     */
    public function updateLicense(Request $request, int $tenantId): JsonResponse
    {
        try {
            $request->validate([
                'module_code' => 'required|string',
                'is_active' => 'required|boolean',
                'agreed_price' => 'nullable|numeric|min:0',
                'starts_at' => 'nullable|date',
                'expires_at' => 'nullable|date',
            ]);

            $tenant = Tenant::find($tenantId);
            if (!$tenant) {
                return $this->error('Kurum bulunamadı.', [], 404);
            }

            $license = TenantModuleLicense::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'module_code' => $request->module_code,
                ],
                [
                    'is_active' => $request->boolean('is_active'),
                    'agreed_price' => $request->input('agreed_price', 0),
                    'starts_at' => $request->starts_at ?: now()->toDateString(),
                    'expires_at' => $request->expires_at,
                ]
            );

            // Okulun toplam sözleşme tutarını aktif lisansların toplamı olarak güncelle (eğer otomatik istenirse)
            $totalAgreed = TenantModuleLicense::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->sum('agreed_price');

            if ($totalAgreed > 0) {
                $tenant->update(['contract_amount' => $totalAgreed]);
            }

            return $this->success($license, 'Lisans durumu başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Lisans güncellenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Aliases for standard REST / SuperAdmin routes
     */
    public function index(int $tenantId): JsonResponse
    {
        return $this->getLicenses($tenantId);
    }

    public function toggle(Request $request, int $tenantId): JsonResponse
    {
        $moduleCode = $request->input('module_code') ?: $request->input('module_key');
        $request->merge(['module_code' => $moduleCode]);
        return $this->updateLicense($request, $tenantId);
    }

    public function updatePrice(Request $request, int $tenantId, int $licenseId): JsonResponse
    {
        try {
            $license = TenantModuleLicense::where('tenant_id', $tenantId)->findOrFail($licenseId);
            $price = $request->input('custom_price') ?? $request->input('agreed_price');
            $license->update(['agreed_price' => $price]);
            return $this->success($license, 'Lisans fiyatı güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Fiyat güncellenemedi: ' . $e->getMessage(), [], 500);
        }
    }
}
