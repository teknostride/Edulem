<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EagerLoadAuthRelations
{
    /**
     * Auth user'ın role ilişkisini tek seferde eager-load eder.
     * Böylece controller'larda $user->role erişimi ek DB sorgusu tetiklemez.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user instanceof \App\Models\User && !$user->relationLoaded('role')) {
            $user->load('role');
        }

        return $next($request);
    }
}
