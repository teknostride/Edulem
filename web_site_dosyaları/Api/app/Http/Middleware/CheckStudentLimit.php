<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStudentLimit
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Yetkilendirme gerekli.',
            ], 401);
        }

        // SuperAdmin limit kontrolü yapmaz
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if (!$tenant || !$tenant->canAddStudents()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => 'Öğrenci limitinize ulaştınız. Daha fazla öğrenci eklemek için aboneliğinizi yükseltin.',
            ], 403);
        }

        return $next($request);
    }
}
