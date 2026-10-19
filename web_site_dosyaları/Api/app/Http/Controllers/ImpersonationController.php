<?php

namespace App\Http\Controllers;

use App\Actions\ImpersonateUserAction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImpersonationController extends ApiController
{
    /**
     * Start impersonation.
     *
     * @param  int  $userId
     * @param  \App\Actions\ImpersonateUserAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function start(int $userId, ImpersonateUserAction $action): JsonResponse
    {
        try {
            $targetUser = User::findOrFail($userId);
            $result = $action->start($targetUser);

            return $this->success($result['data'], $result['message']);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 403);
        }
    }

    /**
     * Stop impersonation.
     *
     * @param  \App\Actions\ImpersonateUserAction  $action
     * @return \Illuminate\Http\JsonResponse
     */
    public function stop(ImpersonateUserAction $action): JsonResponse
    {
        try {
            $result = $action->stop();

            return $this->success([], $result['message']);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), [], 400);
        }
    }

    /**
     * Get current impersonation status.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function status(): JsonResponse
    {
        $isImpersonating = session('impersonating', false);
        $impersonatorId = session('impersonator_id');
        $targetUserId = session('impersonated_user_id');

        if (!$isImpersonating) {
            return $this->success([
                'impersonating' => false,
            ], 'Aktif impersonation oturumu yok.');
        }

        $impersonator = User::find($impersonatorId);
        $targetUser = User::find($targetUserId);

        return $this->success([
            'impersonating' => true,
            'impersonator' => $impersonator ? [
                'id' => $impersonator->id,
                'name' => $impersonator->name,
            ] : null,
            'target_user' => $targetUser ? [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
            ] : null,
        ], 'Impersonation oturumu aktif.');
    }
}
