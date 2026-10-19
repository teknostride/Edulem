<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\ApiController;
use App\Http\Requests\SuperAdmin\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends ApiController
{
    /**
     * Super admin login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $credentials = $request->only('email', 'password');
            
            // Find user with super admin privileges
            $user = User::where('email', $credentials['email'])
                ->where('is_superadmin', true)
                ->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                return $this->error('Geçersiz email veya şifre. Süper admin yetkisi gereklidir.', [], 401);
            }

            // Revoke previous tokens
            $user->tokens()->delete();

            // Create new token
            $token = $user->createToken('super-admin-token', ['super-admin'])->plainTextToken;

            return $this->success([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_super_admin' => (bool) $user->is_superadmin,
                ],
                'token' => $token,
                'token_type' => 'Bearer'
            ], 'Super admin girişi başarılı.');

        } catch (\Exception $e) {
            return $this->error('Giriş sırasında bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Super admin logout
     */
    public function logout(): JsonResponse
    {
        try {
            Auth::user()->tokens()->delete();
            return $this->success([], 'Çıkış yapıldı.');
        } catch (\Exception $e) {
            return $this->error('Çıkış yapılırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get current super admin user
     */
    public function me(): JsonResponse
    {
        try {
            $user = Auth::user();
            
            if (!$user->is_superadmin) {
                return $this->error('Süper admin yetkisi bulunamadı.', [], 403);
            }

            return $this->success([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_super_admin' => (bool) $user->is_superadmin,
                ]
            ], 'Super admin bilgileri getirildi.');

        } catch (\Exception $e) {
            return $this->error('Kullanıcı bilgileri alınırken bir hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
