<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    /**
     * Login user and create token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'tc_no' => 'required|string',
            'password' => 'required|string',
            'device_name' => 'sometimes|string|max:255',
        ]);

        $tcNo = preg_replace('/\D/', '', (string) $request->tc_no);
        if (!$tcNo) {
            return response()->json([
                'status' => false,
                'message' => 'TC Kimlik No gereklidir.'
            ], 422);
        }
        // Not: Eski mobil uygulama versiyonlarında TC alanında karakter sınırı
        // yoktu. Geriye dönük uyumluluk için 11 hane zorunluluğu kaldırıldı.
        // TC, kullanıcı tablosunda tam eşleşme ile aranır.

        // 1) Personel kullanıcı girişi
        $user = User::where('tc_no', $tcNo)->first();
        if ($user && Hash::check($request->password, $user->password)) {
            $token = $user->createToken('api-token')->plainTextToken;
            return response()->json([
                'status' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'tc_no' => $user->tc_no,
                        'tenant_id' => $user->tenant_id,
                        'campus_ids' => array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])))),
                        'education_level_ids' => array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])))),
                        'role' => $user->role ? $user->role->name : null,
                        'role_name' => $user->role ? $user->role->name : null,
                        'role_id' => $user->role_id,
                    ],
                    'token' => $token,
                ],
                'message' => 'Giriş başarılı.'
            ]);
        }

        // 2) Öğrenci TC'si ile Öğrenci Portalı Girişi (Veli de bu şifreyle girer) – YALNIZCA AKTİF SEZON
        $student = Student::query()
            ->withoutGlobalScope(\App\Scopes\SeasonScope::class)
            ->where('tc_no', $tcNo)
            ->with(['classroom', 'season'])
            ->get()
            ->first(function ($s) {
                return $s->season && $s->season->is_active;
            });

        if (!$student) {
            return response()->json([
                'status' => false,
                'message' => 'Giriş bilgileri hatalı veya kaydınız aktif değil.'
            ], 401);
        }

        if (empty($student->password) || !Hash::check($request->password, $student->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Giriş bilgileri hatalı veya kaydınız aktif değil.'
            ], 401);
        }

        if (isset($student->is_portal_active) && !$student->is_portal_active) {
            return response()->json([
                'status' => false,
                'message' => 'Öğrenci portal erişimi aktif değil.'
            ], 403);
        }

        $token = $student->createToken($request->device_name ?? 'portal-token')->plainTextToken;
        if (\Illuminate\Support\Facades\Schema::hasColumn('students', 'last_login_at')) {
            $student->update(['last_login_at' => now()]);
        }

        return response()->json([
            'status' => true,
            'data' => [
                'user' => [
                    'id' => (int) $student->id,
                    'student_id' => (int) $student->id,
                    'name' => $student->name,
                    'student_name' => $student->name,
                    'tc_no' => $student->tc_no,
                    'school_no' => $student->school_no,
                    'classroom_name' => $student->classroom?->name,
                    'role' => 'student',
                    'role_name' => 'student',
                    'role_label' => 'Öğrenci',
                ],
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'student_name' => $student->name,
                    'tc_no' => $student->tc_no,
                    'school_no' => $student->school_no,
                    'classroom_name' => $student->classroom?->name,
                ],
                'token' => $token,
            ],
            'message' => 'Giriş başarılı.'
        ]);
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            try {
                $userType = ($user instanceof \App\Models\Student) ? 'student' : 'user';
                $deviceToken = $request->input('device_token');
                $query = \App\Models\DeviceToken::where('user_type', $userType)->where('user_id', $user->id);
                if ($deviceToken) {
                    $query->where('token', $deviceToken);
                }
                $query->delete();
            } catch (\Throwable $e) {}

            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'status' => true,
            'message' => 'Çıkış başarılı.'
        ]);
    }

    /**
     * Get authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && !$user->relationLoaded('role')) {
            $user->load('role');
        }

        return response()->json([
            'status' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'tc_no' => $user->tc_no,
                    'tenant_id' => $user->tenant_id,
                    'campus_ids' => array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])))),
                    'education_level_ids' => array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])))),
                    'role' => $user->role ? $user->role->name : null,
                    'role_name' => $user->role ? $user->role->name : null,
                    'role_id' => $user->role_id,
                ],
            ],
            'message' => 'Kullanıcı bilgileri getirildi.'
        ]);
    }

    /**
     * Get current user profile (for Profil sayfası).
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('role');
        $campusIds = array_filter(array_map('intval', (array) ($user->campus_ids ?? [])));
        $campuses = $campusIds ? \App\Models\Campus::whereIn('id', $campusIds)->get(['id', 'name']) : collect();
        $campusName = $campuses->pluck('name')->implode(', ') ?: null;

        $avatarUrl = null;
        if (! empty($user->avatar)) {
            $baseUrl = rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/');
            $avatarUrl = $baseUrl . '/' . ltrim($user->avatar, '/');
        }

        return response()->json([
            'status' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'birth_date' => $user->birth_date ? ($user->birth_date instanceof \DateTimeInterface ? $user->birth_date->format('Y-m-d') : substr((string) $user->birth_date, 0, 10)) : null,
                'tc_no' => $user->tc_no,
                'avatar' => $avatarUrl,
                'role_name' => $user->role ? $user->role->name : null,
                'role_id' => $user->role_id,
                'role_label' => $user->role ? $user->role->display_name : null,
                'campus_name' => $campusName,
                'campus_ids' => array_values(array_filter(array_map('intval', (array) ($user->campus_ids ?? [])))),
                'education_level_ids' => array_values(array_filter(array_map('intval', (array) ($user->education_level_ids ?? [])))),
                'created_at' => $user->created_at?->toIso8601String(),
                'updated_at' => $user->updated_at?->toIso8601String(),
            ],
            'message' => 'Profil getirildi.',
        ]);
    }

    /**
     * Update current user profile (ad, soyad, e-posta, telefon, şifre) – veritabanına yazar.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'sometimes|nullable|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'avatar' => 'nullable|image|max:2048',
            'current_password' => 'nullable|string',
            'password' => 'nullable|string|min:6|confirmed',
        ], [
            'email.unique' => 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.',
            'password.min' => 'Şifre en az 6 karakter olmalıdır.',
            'password.confirmed' => 'Şifre tekrarı eşleşmiyor.',
        ]);

        if (!empty($validated['current_password']) && !empty($validated['password'])) {
            $currentMatches = false;
            if (!empty($user->password) && Hash::check($validated['current_password'], $user->password)) {
                $currentMatches = true;
            }

            if (!$currentMatches && $user instanceof Student) {
                // Diğer sezon kayıtları
                if (!empty($user->tc_no)) {
                    $otherSeasonStudents = Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                        ->where('tc_no', $user->tc_no)
                        ->where('id', '!=', $user->id)
                        ->get();
                    foreach ($otherSeasonStudents as $s) {
                        if (!empty($s->password) && Hash::check($validated['current_password'], $s->password)) {
                            $currentMatches = true;
                            break;
                        }
                    }
                }
            }

            if (!$currentMatches) {
                return response()->json([
                    'status' => false,
                    'message' => 'Mevcut şifre hatalı.',
                ], 422);
            }

            $hashed = Hash::make($validated['password']);
            $user->password = $hashed;

            if ($user instanceof Student) {
                if (!empty($user->tc_no)) {
                    Student::withoutGlobalScope(\App\Scopes\SeasonScope::class)
                        ->where('tc_no', $user->tc_no)
                        ->update(['password' => $hashed, 'is_portal_active' => true]);
                }
            }
        }
        unset($validated['current_password'], $validated['password'], $validated['password_confirmation']);

        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $validated['name'] = trim(($validated['first_name'] ?? $user->first_name ?? '') . ' ' . ($validated['last_name'] ?? $user->last_name ?? ''));
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            if ($file) {
                // Eski avatarı sil
                if (! empty($user->avatar)) {
                    $oldPath = public_path($user->avatar);
                    if (file_exists($oldPath)) {
                        @unlink($oldPath);
                    }
                }
                // public/avatars/ klasörüne kaydet (symlink gerektirmez)
                $avatarsDir = public_path('avatars');
                if (! is_dir($avatarsDir)) {
                    mkdir($avatarsDir, 0775, true);
                }
                $filename = uniqid('avatar_', true) . '.jpg';
                $file->move($avatarsDir, $filename);
                $user->avatar = 'avatars/' . $filename;
            }
        }

        unset($validated['avatar']);

        $user->fill($validated);
        try {
            $user->save();
        } catch (\Illuminate\Database\QueryException $qe) {
            if (str_contains($qe->getMessage(), "Unknown column 'birth_date'") || str_contains($qe->getMessage(), "birth_date")) {
                try {
                    \Illuminate\Support\Facades\DB::statement('ALTER TABLE users ADD COLUMN birth_date DATE NULL AFTER avatar');
                    $user->save();
                } catch (\Throwable $ex) {
                    unset($user->birth_date);
                    $user->save();
                }
            } else {
                throw $qe;
            }
        }

        $avatarUrl = null;
        if (! empty($user->avatar)) {
            $baseUrl = rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/');
            $avatarUrl = $baseUrl . '/' . ltrim($user->avatar, '/');
        }

        return response()->json([
            'status' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'birth_date' => $user->birth_date ? ($user->birth_date instanceof \DateTimeInterface ? $user->birth_date->format('Y-m-d') : substr((string) $user->birth_date, 0, 10)) : null,
                    'avatar' => $avatarUrl,
                    'role_id' => $user->role_id,
                    'role' => $user->role?->name,
                    'role_label' => $user->role?->display_name,
                ],
            ],
            'message' => 'Profil başarıyla güncellendi.',
        ]);
    }
}
