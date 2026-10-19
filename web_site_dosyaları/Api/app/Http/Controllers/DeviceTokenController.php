<?php

namespace App\Http\Controllers;

use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DeviceTokenController extends ApiController
{
    /**
     * Cihaz token'ını kaydet veya güncelle
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'token' => 'required|string|max:500',
                'platform' => 'nullable|string|max:20',
                'device_name' => 'nullable|string|max:100',
            ]);

            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }

            $userType = ($user instanceof \App\Models\Student) ? 'student' : 'user';

            $platform = strtolower($request->input('platform', 'android'));
            if (!in_array($platform, ['android', 'ios', 'web'])) {
                $platform = 'android';
            }

            $deviceToken = DeviceToken::updateOrCreate(
                [
                    'user_type' => $userType,
                    'user_id' => $user->id,
                    'token' => $request->token,
                ],
                [
                    'tenant_id' => $user->tenant_id,
                    'platform' => $platform,
                    'device_name' => $request->input('device_name'),
                    'last_active_at' => now(),
                ]
            );

            return $this->success([
                'id' => $deviceToken->id,
                'platform' => $deviceToken->platform,
            ], 'Cihaz bildirim kaydı başarıyla oluşturuldu.');
        } catch (\Throwable $e) {
            Log::error('Device token store error: ' . $e->getMessage());
            return $this->error('Cihaz token kaydedilirken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Cihaz token'ını sil (Çıkış yaparken)
     */
    public function destroy(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return $this->error('Oturum açmanız gerekiyor.', [], 401);
            }

            $userType = ($user instanceof \App\Models\Student) ? 'student' : 'user';
            $token = $request->input('token');

            $query = DeviceToken::where('user_type', $userType)->where('user_id', $user->id);
            if ($token) {
                $query->where('token', $token);
            }
            $query->delete();

            return $this->success([], 'Cihaz bildirim kaydı başarıyla silindi.');
        } catch (\Throwable $e) {
            Log::error('Device token destroy error: ' . $e->getMessage());
            return $this->error('Cihaz token silinirken hata oluştu: ' . $e->getMessage(), [], 500);
        }
    }
}
