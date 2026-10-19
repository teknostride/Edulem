<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

abstract class ApiController extends Controller
{
    protected function isUnrestrictedUser($user): bool
    {
        if (! $user) {
            return false;
        }

        if (!empty($user->is_superadmin)) {
            return true;
        }

        $roleName = $user->role?->name;
        return in_array($roleName, ['owner', 'kurucu', 'founder', 'Admin', 'admin', 'Genel Müdür', 'superadmin'], true);
    }

    protected function allowedEducationLevelIds($user): array
    {
        if (! $user) {
            return [];
        }

        $ids = (array) ($user->education_level_ids ?? []);
        return array_values(array_filter(array_map('intval', $ids), static fn ($id) => $id > 0));
    }

    protected function getCurrentSeasonId(): ?int
    {
        $user = auth()->user();
        if (!$user) return null;

        $id = null;

        // 1. Request Query
        if (request()->has('season_id')) {
            $id = (int) request('season_id');
        }

        // 2. Request Header
        if (!$id && request()->hasHeader('X-Season-Id')) {
            $id = (int) request()->header('X-Season-Id');
        }

        // 3. Security check & Fallback to active
        if ($id) {
            $exists = \App\Models\Season::where('id', $id)
                ->where('tenant_id', $user->tenant_id)
                ->exists();
            if ($exists) return $id;
        }

        return \Illuminate\Support\Facades\Cache::remember("active_season_tenant_{$user->tenant_id}", 3600, function () use ($user) {
            return \App\Models\Season::where('tenant_id', $user->tenant_id)
                ->where('is_active', true)
                ->value('id');
        });
    }

    /**
     * Success response.
     *
     * @param  mixed  $data
     * @param  string  $message
     * @param  int  $statusCode
     * @return JsonResponse
     */
    protected function success(mixed $data = [], string $message = 'İşlem başarılı.', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'status' => true,
            'data' => $data,
            'message' => $message,
        ], $statusCode);
    }

    /**
     * Error response.
     *
     * @param  string  $message
     * @param  mixed  $errors
     * @param  int  $statusCode
     * @return JsonResponse
     */
    protected function error(string $message = 'Bir hata oluştu.', mixed $errors = [], int $statusCode = 400): JsonResponse
    {
        $response = [
            'status' => false,
            'data' => [],
            'message' => $message,
        ];

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Paginated response.
     *
     * @param  \Illuminate\Contracts\Pagination\LengthAwarePaginator  $paginator
     * @param  string  $message
     * @return JsonResponse
     */
    protected function paginated($paginator, string $message = 'İşlem başarılı.'): JsonResponse
    {
        return response()->json([
            'status' => true,
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'message' => $message,
        ], 200);
    }
}
