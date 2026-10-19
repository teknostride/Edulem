<?php

namespace App\Actions;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImpersonateUserAction
{
    /**
     * Execute the action to impersonate a user.
     *
     * @param  \App\Models\User  $targetUser
     * @return array
     */
    public function start(User $targetUser): array
    {
        $impersonator = Auth::user();

        // Sadece SuperAdmin veya Genel Müdür impersonate edebilir
        if (!$impersonator->is_superadmin && $impersonator->role?->name !== 'general_manager') {
            throw new \Exception('Bu işlem için yetkiniz bulunmamaktadır.');
        }

        // Aynı tenant'ta olmalı (SuperAdmin hariç)
        if (!$impersonator->is_superadmin && $impersonator->tenant_id !== $targetUser->tenant_id) {
            throw new \Exception('Farklı tenant kullanıcısı impersonate edilemez.');
        }

        return DB::transaction(function () use ($impersonator, $targetUser) {
            // Session'a impersonation bilgisini kaydet
            session([
                'impersonating' => true,
                'impersonator_id' => $impersonator->id,
                'impersonated_user_id' => $targetUser->id,
            ]);

            // Activity log kaydet
            ActivityLog::create([
                'tenant_id' => $targetUser->tenant_id,
                'user_id' => $targetUser->id,
                'impersonator_id' => $impersonator->id,
                'action' => 'impersonate_start',
                'entity_type' => User::class,
                'entity_id' => $targetUser->id,
                'new_values' => [
                    'impersonator' => $impersonator->name,
                    'target_user' => $targetUser->name,
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Kullanıcıya notification gönder
            $targetUser->notify(new \App\Notifications\ImpersonationNotification($impersonator, true));

            return [
                'success' => true,
                'message' => "{$targetUser->name} adına oturum açıldı.",
                'data' => [
                    'impersonator' => [
                        'id' => $impersonator->id,
                        'name' => $impersonator->name,
                    ],
                    'target_user' => [
                        'id' => $targetUser->id,
                        'name' => $targetUser->name,
                    ],
                ],
            ];
        });
    }

    /**
     * Stop impersonation.
     *
     * @return array
     */
    public function stop(): array
    {
        $impersonatorId = session('impersonator_id');
        $targetUserId = session('impersonated_user_id');

        if (!$impersonatorId || !$targetUserId) {
            throw new \Exception('Aktif bir impersonation oturumu bulunamadı.');
        }

        return DB::transaction(function () use ($impersonatorId, $targetUserId) {
            $impersonator = User::find($impersonatorId);
            $targetUser = User::find($targetUserId);

            // Activity log kaydet
            ActivityLog::create([
                'tenant_id' => $targetUser->tenant_id,
                'user_id' => $targetUser->id,
                'impersonator_id' => $impersonator->id,
                'action' => 'impersonate_stop',
                'entity_type' => User::class,
                'entity_id' => $targetUser->id,
                'new_values' => [
                    'impersonator' => $impersonator->name,
                    'target_user' => $targetUser->name,
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Kullanıcıya notification gönder
            $targetUser->notify(new \App\Notifications\ImpersonationNotification($impersonator, false));

            // Session'ı temizle
            session()->forget(['impersonating', 'impersonator_id', 'impersonated_user_id']);

            return [
                'success' => true,
                'message' => 'Impersonation oturumu sonlandırıldı.',
            ];
        });
    }
}
