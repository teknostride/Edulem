<?php

namespace App\Http\Controllers;

use App\Models\Campus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampusController extends ApiController
{
    private function isStudentAffairsRole(?string $roleName): bool
    {
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    /**
     * Display a listing of campuses.
     */
    public function index(): JsonResponse
    {
        try {
            $query = Campus::query()
                ->select(['id', 'tenant_id', 'name', 'is_active'])
                ->where('is_active', true);
            
            // Tenant kontrolü - sadece kendi tenant'ının kampüslerini görebilir
            $user = auth()->user();
            $userTenantId = $user ? $user->tenant_id : null;

            if ($user && $userTenantId) {
                $query->where('tenant_id', $userTenantId);
            }

            // Müdür / Müdür Yardımcısı / Öğrenci İşleri / Rehberlik: Sadece atandığı kampüsleri görebilir
            $roleName = $user && $user->role ? $user->role->name : null;
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs', 'Rehberlik', 'guidance', 'Rehber Öğretmen', 'rehber_teacher', 'guidance_teacher'], true) && $user) {
                $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                if (!empty($campusIds)) {
                    $query->whereIn('id', $campusIds);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }

            if (request()->filled('search')) {
                $search = trim((string) request('search'));
                if ($search !== '') {
                    $query->where('name', 'like', '%' . $search . '%');
                }
            }

            $perPage = (int) request()->get('per_page', 100);
            if ($perPage <= 0) {
                $perPage = 100;
            }
            $perPage = min($perPage, 200);

            $campuses = $query->orderBy('name')->paginate($perPage);

            return $this->success([
                'campuses' => $campuses->items(),
                'pagination' => [
                    'current_page' => $campuses->currentPage(),
                    'last_page' => $campuses->lastPage(),
                    'per_page' => $campuses->perPage(),
                    'total' => $campuses->total(),
                ],
            ], 'Kampüsler başarıyla listelendi.');
        } catch (\Exception $e) {
            return $this->error('Kampüsler listelenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created campus.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            if (! $user) {
                return $this->error('Kullanıcı giriş yapmamış.', [], 401);
            }
            $roleName = $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'], true)) {
                return $this->error('Kampüs ekleme yetkisi sadece kurucuya aittir.', [], 403);
            }

            if (! $user->tenant_id) {
                return $this->error('Kurum bilgisi bulunamadı. Lütfen önce kurum bilgileri sayfasından kurumunuzun tanımlı olduğundan emin olun.', [], 404);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'address' => 'nullable|string',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'manager_id' => 'nullable|exists:users,id',
            ]);

            $validated['tenant_id'] = $user->tenant_id;
            $validated['is_active'] = true;
            $campus = Campus::create($validated);

            return $this->success(
                ['campus' => $campus->load('manager')],
                'Kampüs başarıyla oluşturuldu.',
                201
            );
        } catch (\Exception $e) {
            return $this->error('Kampüs oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified campus.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            $campus = Campus::with(['manager', 'tenant', 'branches'])->findOrFail($id);
            if ($user && $user->tenant_id && (int) $campus->tenant_id !== (int) $user->tenant_id) {
                return $this->error('Bu kampüse erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true) && $user) {
                $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
                if (empty($campusIds) || ! in_array((int) $campus->id, $campusIds, true)) {
                    return $this->error('Bu kampüse erişim yetkiniz yok.', [], 403);
                }
            }
            return $this->success(['campus' => $campus], 'Kampüs başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Kampüs bulunamadı.', [], 404);
        }
    }

    /**
     * Update the specified campus.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $campus = Campus::findOrFail($id);
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'], true)) {
                return $this->error('Kampüs düzenleme yetkisi sadece kurucuya aittir.', [], 403);
            }
            if ($user && $user->tenant_id && (int) $campus->tenant_id !== (int) $user->tenant_id) {
                return $this->error('Bu kampüse erişim yetkiniz yok.', [], 403);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'address' => 'nullable|string',
                'phone' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'manager_id' => 'nullable|exists:users,id',
                'is_active' => 'sometimes|boolean',
            ]);

            $campus->update($validated);

            return $this->success(
                ['campus' => $campus->load('manager')],
                'Kampüs başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Kampüs güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified campus.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $campus = Campus::findOrFail($id);
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri'], true)) {
                return $this->error('Kampüs silme yetkisi sadece kurucuya aittir.', [], 403);
            }
            if ($user && $user->tenant_id && (int) $campus->tenant_id !== (int) $user->tenant_id) {
                return $this->error('Bu kampüse erişim yetkiniz yok.', [], 403);
            }
            $campus->delete();

            return $this->success([], 'Kampüs başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Kampüs silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}