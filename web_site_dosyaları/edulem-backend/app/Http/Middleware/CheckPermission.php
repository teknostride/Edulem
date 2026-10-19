<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // SuperAdmin has all permissions
        if ($user->is_superadmin) {
            return $next($request);
        }

        // Check regular user permissions
        if (!$user->hasPermission($permission)) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Bu işlem için yetkiniz bulunmamaktadır.',
            ], 403);
        }

        return $next($request);
    }
}
