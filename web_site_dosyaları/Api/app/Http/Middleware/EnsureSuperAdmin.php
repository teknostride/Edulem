<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!auth()->user()->isSuperAdmin()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Bu işlem için SuperAdmin yetkisi gereklidir.',
            ], 403);
        }

        return $next($request);
    }
}
