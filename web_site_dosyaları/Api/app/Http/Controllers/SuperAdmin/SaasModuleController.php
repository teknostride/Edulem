<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Models\SaasModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaasModuleController extends ApiController
{
    /**
     * List all SaaS modules (*lem products) with license counts.
     */
    public function index(): JsonResponse
    {
        try {
            $modules = SaasModule::withCount(['licenses as active_schools_count' => function ($q) {
                $q->where('is_active', true);
            }])->orderBy('sort_order')->get();

            return $this->success($modules, 'Modüller başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Modüller listelenirken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Create a new *lem product/module.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'code' => 'required|string|max:50|unique:saas_modules,code|regex:/^[a-z0-9_]+$/',
                'name' => 'required|string|max:100',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:50',
                'badge_color' => 'nullable|string|max:30',
                'annual_price' => 'required|numeric|min:0',
                'monthly_price' => 'nullable|numeric|min:0',
                'is_active' => 'boolean',
                'sort_order' => 'nullable|integer',
            ]);

            $module = SaasModule::create([
                'code' => strtolower(trim($request->code)),
                'name' => trim($request->name),
                'description' => $request->description,
                'icon' => $request->icon ?: 'ti-apps',
                'badge_color' => $request->badge_color ?: 'primary',
                'annual_price' => $request->annual_price,
                'monthly_price' => $request->monthly_price ?: ($request->annual_price / 10),
                'is_active' => $request->boolean('is_active', true),
                'sort_order' => (int) ($request->sort_order ?: 0),
            ]);

            return $this->success($module, 'Yeni *lem ürünü başarıyla eklendi.', 201);
        } catch (\Exception $e) {
            return $this->error('Modül eklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update module details or pricing.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $module = SaasModule::find($id);
            if (!$module) {
                return $this->error('Modül bulunamadı.', [], 404);
            }

            $request->validate([
                'name' => 'sometimes|required|string|max:100',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:50',
                'badge_color' => 'nullable|string|max:30',
                'annual_price' => 'sometimes|numeric|min:0',
                'monthly_price' => 'nullable|numeric|min:0',
                'is_active' => 'boolean',
                'sort_order' => 'nullable|integer',
            ]);

            $module->update($request->only([
                'name', 'description', 'icon', 'badge_color',
                'annual_price', 'monthly_price', 'is_active', 'sort_order'
            ]));

            return $this->success($module, 'Modül başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Modül güncellenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete a module (Only Patron).
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Bu işlem için Patron yetkisi gereklidir.', [], 403);
            }

            $module = SaasModule::find($id);
            if (!$module) {
                return $this->error('Modül bulunamadı.', [], 404);
            }

            $module->delete();
            return $this->success([], 'Modül silindi.');
        } catch (\Exception $e) {
            return $this->error('Modül silinirken hata: ' . $e->getMessage(), [], 500);
        }
    }
}
