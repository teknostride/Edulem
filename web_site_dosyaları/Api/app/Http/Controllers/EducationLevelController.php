<?php

namespace App\Http\Controllers;

use App\Models\EducationLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EducationLevelController extends ApiController
{
    private function isStudentAffairsRole(?string $roleName): bool
    {
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    /**
     * Display a listing of education levels.
     */
    public function index(): JsonResponse
    {
        try {
            $query = EducationLevel::query()
                ->select(['id', 'tenant_id', 'campus_id', 'name', 'code', 'sort_order', 'is_active'])
                ->with(['campus:id,name']);

            // Tenant kontrolü - sadece kendi tenant'ının eğitim seviyelerini görebilir
            $user = auth()->user();
            $userTenantId = $user ? $user->tenant_id : null;
            $roleName = $user && $user->role ? $user->role->name : null;

            if ($user && $userTenantId) {
                $query->where('tenant_id', $userTenantId);
            }

            // Müdür / Müdür Yardımcısı / Öğrenci İşleri / Rehberlik: Sadece atandığı kademeleri görebilir
            $roleNameLower = $roleName ? mb_strtolower(trim($roleName), 'UTF-8') : '';
            $scopedRoles = ['müdür', 'müdür yardımcısı', 'mudur yardimcisi', 'öğrenci işleri', 'ogrenci isleri', 'student_affairs', 'rehberlik', 'guidance', 'rehber öğretmen', 'rehber_teacher', 'guidance_teacher'];
            if (in_array($roleNameLower, $scopedRoles, true) && $user) {
                $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
                if (! empty($educationLevelIds)) {
                    $query->whereIn('id', $educationLevelIds);
                }
            }

            // Eğer campus bazlı filtre gelirse uygulayalım
            if (request()->has('campus_id') && request()->campus_id) {
                $query->where('campus_id', request('campus_id'));
            }

            $campusIds = request()->input('campus_ids');
            if ($campusIds !== null) {
                if (is_string($campusIds)) {
                    $campusIds = array_filter(array_map('trim', explode(',', $campusIds)));
                }
                if (is_array($campusIds)) {
                    $campusIds = array_filter(array_map('intval', $campusIds), static fn ($id) => $id > 0);
                    if (! empty($campusIds)) {
                        $query->whereIn('campus_id', $campusIds);
                    }
                }
            }

            if (request()->filled('search')) {
                $search = trim((string) request('search'));
                if ($search !== '') {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%')
                            ->orWhere('code', 'like', '%' . $search . '%');
                    });
                }
            }

            $ids = request()->input('ids');
            if ($ids !== null) {
                if (is_string($ids)) {
                    $ids = array_filter(array_map('trim', explode(',', $ids)));
                }
                if (is_array($ids)) {
                    $ids = array_filter(array_map('intval', $ids), static fn ($id) => $id > 0);
                    if (! empty($ids)) {
                        $query->whereIn('id', $ids);
                    }
                }
            }

            $perPage = (int) request()->get('per_page', 100);
            if ($perPage <= 0) {
                $perPage = 100;
            }
            $perPage = min($perPage, 200);

            $educationLevels = $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc')->paginate($perPage);
            collect($educationLevels->items())->each(function ($level) {
                $level->setAttribute('campus_name', optional($level->campus)->name);
            });

            return $this->success([
                'education_levels' => $educationLevels->items(),
                'pagination' => [
                    'current_page' => $educationLevels->currentPage(),
                    'last_page' => $educationLevels->lastPage(),
                    'per_page' => $educationLevels->perPage(),
                    'total' => $educationLevels->total(),
                ],
            ], 'Eğitim seviyeleri başarıyla listelendi.');

        } catch (\Exception $e) {
            return $this->error('Liste hatası: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Store a newly created education level.
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
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı'], true)) {
                return $this->error('Eğitim kademesi ekleme yetkisi sadece kurucuya aittir.', [], 403);
            }

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:10|unique:education_levels,code,NULL,id,tenant_id,' . $user->tenant_id,
                'campus_id' => 'required|exists:campuses,id',
            ]);

            $level = EducationLevel::create([
                'tenant_id'  => $user->tenant_id,
                'campus_id'  => $validated['campus_id'],
                'name'       => $validated['name'],
                'code'       => strtoupper($validated['code']),
                'is_active'  => 1,
                'sort_order' => 0
            ]);

            return $this->success(['education_level' => $level], 'Eğitim seviyesi başarıyla oluşturuldu.', 201);

        } catch (\Exception $e) {
            return $this->error('Eğitim seviyesi oluşturulurken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Display the specified education level.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;

            $educationLevel = EducationLevel::with(['tenant', 'branches'])->findOrFail($id);
            if ($user && $user->tenant_id && (int) $educationLevel->tenant_id !== (int) $user->tenant_id) {
                return $this->error('Bu eğitim kademesine erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı', 'Öğrenci İşleri', 'student_affairs'], true) && $user) {
                $educationLevelIds = array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])));
                if (empty($educationLevelIds) || ! in_array((int) $educationLevel->id, $educationLevelIds, true)) {
                    return $this->error('Bu eğitim kademesine erişim yetkiniz yok.', [], 403);
                }
            }
            $educationLevel->setAttribute('campus_name', optional($educationLevel->campus)->name);
            return $this->success(['education_level' => $educationLevel], 'Eğitim seviyesi başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Eğitim seviyesi bulunamadı.', [], 404);
        }
    }

    /**
     * Update the specified education level.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $educationLevel = EducationLevel::findOrFail($id);
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı'], true)) {
                return $this->error('Eğitim kademesi düzenleme yetkisi sadece kurucuya aittir.', [], 403);
            }

            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'code' => 'sometimes|string|max:50|unique:education_levels,code,' . $id,
                'sort_order' => 'nullable|integer|min:0',
                'campus_id' => 'sometimes|integer|exists:campuses,id',
            ]);

            $educationLevel->update($validated);

            return $this->success(
                ['education_level' => $educationLevel->load('tenant')],
                'Eğitim seviyesi başarıyla güncellendi.'
            );
        } catch (\Exception $e) {
            return $this->error('Eğitim seviyesi güncellenirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Remove the specified education level.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $educationLevel = EducationLevel::findOrFail($id);
            $user = auth()->user();
            $roleName = $user && $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (in_array($roleName, ['Müdür', 'Müdür Yardımcısı'], true)) {
                return $this->error('Eğitim kademesi silme yetkisi sadece kurucuya aittir.', [], 403);
            }
            $educationLevel->delete();

            return $this->success([], 'Eğitim seviyesi başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Eğitim seviyesi silinirken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}