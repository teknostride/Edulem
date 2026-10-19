<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSaasStaff
{
    /**
     * Handle an incoming request for EduLem SaaS Management Portal.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Oturum açmanız gerekmektedir.',
            ], 401);
        }

        $user = auth()->user();

        // Sadece EduLem Şirket Personeli (tenant_id = null ve saas yetkisi olan) girebilir
        if (!$user->isSaasStaff()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Yetkisiz Giriş: Bu portal sadece EduLem şirket personeline aittir.',
            ], 403);
        }

        return $next($request);
    }
}
