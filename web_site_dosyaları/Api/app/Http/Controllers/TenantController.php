<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\Campus;
use App\Models\EducationLevel;
use App\Models\Classroom;
use App\Models\Student;
use App\Models\User;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TenantController extends ApiController
{
    private function isStudentAffairsRole(?string $roleName): bool
    {
        return in_array($roleName, ['Öğrenci İşleri', 'student_affairs'], true);
    }

    /**
     * Get current tenant profile.
     */
    public function profile(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return $this->error('Oturum bulunamadı.', [], 401);
            }
            $roleName = $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }

            if (!$user->tenant_id) {
                if ($user->is_superadmin) {
                    return $this->error('Bu sayfa sadece kurum kullanıcıları içindir. Super Admin olarak giriş yaptınız.', [], 404);
                }
                // Geliştirme / tek kurum: sistemde tek kurum varsa bu kullanıcıya ata
                $only = Tenant::first();
                if ($only && Tenant::count() === 1) {
                    $user->update(['tenant_id' => $only->id]);
                } else {
                    return $this->error('Kullanıcıya ait kurum bulunamadı. Lütfen yöneticinizle iletişime geçin.', [], 404);
                }
            }

            $tenant = Tenant::findOrFail($user->tenant_id);
            $studentCount = Student::where('tenant_id', $tenant->id)->count();

            $logoUrl = null;
            if (!empty($tenant->logo_path)) {
                $rawLogo = trim($tenant->logo_path);
                if (str_starts_with($rawLogo, 'http://') || str_starts_with($rawLogo, 'https://')) {
                    $logoUrl = $rawLogo;
                    if (str_starts_with($logoUrl, 'http://api.edulem.com')) {
                        $logoUrl = 'https://' . substr($logoUrl, 7);
                    }
                } else {
                    $clean = ltrim($rawLogo, '/');
                    if (!str_starts_with($clean, 'storage/')) {
                        $clean = 'storage/' . $clean;
                    }
                    $baseUrl = rtrim(config('app.url') ?: 'https://api.edulem.com', '/');
                    if (str_contains($baseUrl, 'edulem.com') && str_starts_with($baseUrl, 'http://')) {
                        $baseUrl = 'https://' . substr($baseUrl, 7);
                    }
                    $logoUrl = $baseUrl . '/' . $clean;
                }
            }

            $setting = Setting::first();
            $latestVersion = $setting->app_version ?? '1.0.0';
            $minRequiredVersion = $setting->min_required_version ?? '1.0.0';

            return $this->success([
                'id' => $tenant->id,
                'name' => $tenant->name,
                'domain' => $tenant->domain,
                'is_active' => $tenant->is_active,
                'logo_url' => $logoUrl,
                'student_count' => $studentCount,
                'subscription_expires_at' => $tenant->subscription_expires_at,
                'app_version' => $latestVersion,
                'min_required_version' => $minRequiredVersion,
            ], 'Kurum bilgileri başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('Kurum bilgileri alınırken hata: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Update current tenant profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->tenant_id) {
                return $this->error('Kullanıcıya ait kurum bulunamadı.', [], 404);
            }
            $roleName = $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }

            $tenant = Tenant::findOrFail($user->tenant_id);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'domain' => 'required|string|max:255|unique:tenants,domain,' . $tenant->id,
                'logo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:2048',
                'app_version' => 'nullable|string|max:50',
                'min_required_version' => 'nullable|string|max:50',
            ]);

            if ($request->hasFile('logo')) {
                $file = $request->file('logo');
                $ext = $file->getClientOriginalExtension() ?: 'png';
                $filename = 'logo_' . uniqid() . '.' . $ext;
                $relativePath = 'tenant-logos/' . $tenant->id . '/' . $filename;

                // 1. Storage diskine kaydet (storage/app/public)
                $file->storeAs('tenant-logos/' . $tenant->id, $filename, 'public');

                // 2. Doğrudan public/storage içine de kopyala (symlink olmayan paylaşımlı Plesk için)
                $directDir = public_path('storage/tenant-logos/' . $tenant->id);
                if (!is_dir($directDir)) {
                    @mkdir($directDir, 0775, true);
                }
                @copy(storage_path('app/public/' . $relativePath), $directDir . '/' . $filename);

                $validated['logo_path'] = 'tenant-logos/' . $tenant->id . '/' . $filename;
            }

            // Sürüm bilgileri varsa settings tablosunda güncelle
            if ($request->has('app_version') || $request->has('min_required_version')) {
                $settingUpdates = [];
                if ($request->filled('app_version')) {
                    $settingUpdates['app_version'] = trim($request->input('app_version'));
                }
                if ($request->filled('min_required_version')) {
                    $settingUpdates['min_required_version'] = trim($request->input('min_required_version'));
                }
                if (!empty($settingUpdates)) {
                    $setting = Setting::first();
                    if (!$setting) {
                        Setting::create(array_merge([
                            'key' => 'app_version_config',
                            'value' => 'app_version',
                        ], $settingUpdates));
                    } else {
                        Setting::query()->update($settingUpdates);
                    }
                }
            }

            unset($validated['logo'], $validated['app_version'], $validated['min_required_version']);
            $tenant->update($validated);

            $currentSetting = Setting::first();

            return $this->success([
                'tenant' => $tenant->fresh(),
                'app_version' => $currentSetting->app_version ?? '1.0.0',
                'min_required_version' => $currentSetting->min_required_version ?? '1.0.0',
            ], 'Kurum bilgileri başarıyla güncellendi.');
        } catch (\Exception $e) {
            return $this->error('Kurum bilgileri güncellenemedi: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Delete current tenant.
     */
    public function deleteProfile(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->tenant_id) {
                return $this->error('Kullanıcıya ait kurum bulunamadı.', [], 404);
            }
            $roleName = $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }

            $tenant = Tenant::findOrFail($user->tenant_id);
            
            // Kurum silme işlemi - ilişkili verileri de sil
            $tenant->delete();

            return $this->success([], 'Kurum başarıyla silindi.');
        } catch (\Exception $e) {
            return $this->error('Kurum silinemedi: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get tenant statistics.
     */
    public function statistics(): JsonResponse
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return $this->error('Oturum bulunamadı.', [], 401);
            }
            $roleName = $user->role ? $user->role->name : null;
            if ($this->isStudentAffairsRole($roleName)) {
                return $this->error('Bu modüle erişim yetkiniz yok.', [], 403);
            }
            if (!$user->tenant_id) {
                if ($user->is_superadmin) {
                    return $this->error('Bu sayfa sadece kurum kullanıcıları içindir.', [], 404);
                }
                $only = Tenant::first();
                if ($only && Tenant::count() === 1) {
                    $user->update(['tenant_id' => $only->id]);
                } else {
                    return $this->error('Kullanıcıya ait kurum bulunamadı.', [], 404);
                }
            }

            $tenantId = $user->tenant_id;

            $teacherRoleNames = ['Öğretmen', 'Sınıf Öğretmeni', 'teacher'];

            $stats = [
                'campuses' => Campus::where('tenant_id', $tenantId)->count(),
                'education_levels' => EducationLevel::where('tenant_id', $tenantId)->count(),
                'classrooms' => Classroom::where('tenant_id', $tenantId)->count(),
                'students' => Student::where('tenant_id', $tenantId)->count(),
                'teachers' => User::where('tenant_id', $tenantId)
                    ->whereHas('role', function($query) use ($teacherRoleNames) {
                        $query->whereIn('name', $teacherRoleNames);
                    })->count(),
                'staff' => User::where('tenant_id', $tenantId)
                    ->whereHas('role', function ($query) use ($teacherRoleNames) {
                        $query->whereNotIn('name', array_merge(['student'], $teacherRoleNames));
                    })->count(),
            ];

            return $this->success([
                'statistics' => $stats
            ], 'Kurum istatistikleri başarıyla getirildi.');
        } catch (\Exception $e) {
            return $this->error('İstatistikler getirilemedi: ' . $e->getMessage(), [], 500);
        }
    }
}
