<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LogSlowDbQueries
{
    private static bool $listenerRegistered = false;

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) Str::uuid();
        $request->attributes->set('request_id', $requestId);

        if (!self::$listenerRegistered) {
            self::$listenerRegistered = true;

            DB::listen(function ($query) {
                $timeMs = (float) ($query->time ?? 0);

                // Log only slow queries to reduce noise.
                if ($timeMs < 200) {
                    return;
                }

                $reqId = request()?->attributes?->get('request_id');

                Log::warning('Slow DB query', [
                    'request_id' => $reqId,
                    'time_ms' => $timeMs,
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'connection' => $query->connectionName,
                    'url' => request()?->fullUrl(),
                    'method' => request()?->method(),
                ]);
            });
        }

        $start = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $totalMs = (microtime(true) - $start) * 1000;
        if ($totalMs >= 1000) {
            Log::warning('Slow request', [
                'request_id' => $requestId,
                'total_ms' => round($totalMs, 2),
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
