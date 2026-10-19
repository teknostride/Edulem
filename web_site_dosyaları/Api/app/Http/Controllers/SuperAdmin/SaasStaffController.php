<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SaasStaffController extends ApiController
{
    /**
     * List all EduLem company staff (tenant_id = null and saas_role is not null).
     */
    public function index(): JsonResponse
    {
        try {
            $staff = User::whereNull('tenant_id')
                ->where(function ($q) {
                    $q->whereNotNull('saas_role')
                      ->orWhere('is_superadmin', true);
                })
                ->select(['id', 'name', 'email', 'phone', 'is_superadmin', 'saas_role', 'is_active', 'created_at'])
                ->get();

            return $this->success($staff, 'Şirket personeli başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Personel listelenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Add a new staff member (Only Patron).
     */
    public function store(Request $request): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Personel ekleme yetkisi sadece Patron\'a aittir.', [], 403);
            }

            $request->validate([
                'name' => 'required|string|max:150',
                'email' => 'required|email|unique:users,email',
                'phone' => 'nullable|string|max:30',
                'password' => 'required|string|min:6',
                'saas_role' => 'required|string|in:super_admin,technical_support,finance,sales',
            ]);

            $staff = User::create([
                'name' => trim($request->name),
                'email' => trim($request->email),
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'tenant_id' => null, // Şirket personeli okuldan bağımsızdır
                'is_superadmin' => $request->saas_role === 'super_admin',
                'saas_role' => $request->saas_role,
                'is_active' => true,
            ]);

            return $this->success($staff, 'Yeni personel başarıyla oluşturuldu.', 201);
        } catch (\Exception $e) {
            return $this->error('Personel eklenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update staff member (Only Patron).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Personel düzenleme yetkisi sadece Patron\'a aittir.', [], 403);
            }

            $staff = User::whereNull('tenant_id')->find($id);
            if (!$staff) {
                return $this->error('Personel bulunamadı.', [], 404);
            }

            $request->validate([
                'name' => 'sometimes|required|string|max:150',
                'email' => 'sometimes|required|email|unique:users,email,' . $id,
                'phone' => 'nullable|string|max:30',
                'password' => 'nullable|string|min:6',
                'saas_role' => 'sometimes|required|string|in:super_admin,technical_support,finance,sales',
                'is_active' => 'boolean',
            ]);

            $data = $request->only(['name', 'email', 'phone', 'saas_role', 'is_active']);
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }
            if ($request->filled('saas_role')) {
                $data['is_superadmin'] = $request->saas_role === 'super_admin';
            }

            $staff->update($data);

            return $this->success($staff, 'Personel bilgileri güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Güncellenirken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete staff member (Only Patron).
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            if (!auth()->user()->canDeleteTenant()) {
                return $this->error('Bu işlem için Patron yetkisi gereklidir.', [], 403);
            }

            if (auth()->id() === $id) {
                return $this->error('Kendi hesabınızı silemezsiniz.', [], 400);
            }

            $staff = User::whereNull('tenant_id')->find($id);
            if (!$staff) {
                return $this->error('Personel bulunamadı.', [], 404);
            }

            $staff->tokens()->delete();
            $staff->delete();

            return $this->success([], 'Personel başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Silinirken hata: ' . $e->getMessage(), [], 500);
        }
    }
}
