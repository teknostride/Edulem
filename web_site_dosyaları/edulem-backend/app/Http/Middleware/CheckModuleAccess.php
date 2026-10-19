<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $module
     */
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Yetkilendirme gerekli.',
            ], 401);
        }

        // SuperAdmin her modüle erişebilir
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // subscription_modules tablosu yoksa modül kontrolünü atla (migration bekleniyor)
        try {
            if (!Schema::hasTable('subscription_modules')) {
                return $next($request);
            }

            $tenant = $user->tenant;

            if (!$tenant || !$tenant->hasModule($module)) {
                return response()->json([
                    'status' => false,
                    'data' => [],
                    'message' => "Bu modüle erişim yetkiniz bulunmamaktadır. ({$module})",
                ], 403);
            }
        } catch (\Exception $e) {
            // Tablo veya sorgu hatası varsa modülü erişilebilir kabul et
            return $next($request);
        }

        return $next($request);
    }
}

