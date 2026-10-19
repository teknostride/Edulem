<?php

use Illuminate\Support\Facades\Route;

// Installation routes (public, no auth required)
Route::prefix('install')->group(function () {
    Route::get('/check', [\App\Http\Controllers\InstallController::class, 'check']);
    Route::post('/test-connection', [\App\Http\Controllers\InstallController::class, 'testConnection']);
    Route::post('/run', [\App\Http\Controllers\InstallController::class, 'install']);
});

Route::get('/', function () {
    return response()->json([
        'status' => true,
        'message' => 'Premium Edu SaaS API',
        'version' => '1.0.0',
    ]);
});
Route::get('/clear-cache', function() { \Illuminate\Support\Facades\Artisan::call('optimize:clear'); return 'Caches cleared successfully.'; });
Route::get('/show-logs', function() { $logFile = storage_path('logs/laravel.log'); if (!file_exists($logFile)) return 'Log file not found.'; return nl2br(file_get_contents($logFile)); });

// File / Storage serving fallback for Plesk/LiteSpeed hosting without active symlinks
Route::get('/storage/{path}', function ($path) {
    $path = ltrim($path, '/');
    $candidates = [
        public_path('storage/' . $path),
        storage_path('app/public/' . $path),
        public_path($path),
    ];

    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mime = mime_content_type($filePath) ?: 'application/octet-stream';
            return response()->file($filePath, [
                'Content-Type' => $mime,
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, OPTIONS',
                'Cache-Control' => 'public, max-age=604800',
            ]);
        }
    }

    abort(404, 'File not found');
})->where('path', '.*');

Route::get('/avatars/{path}', function ($path) {
    $path = ltrim($path, '/');
    $candidates = [
        public_path('avatars/' . $path),
        storage_path('app/public/avatars/' . $path),
        public_path('storage/avatars/' . $path),
    ];

    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mime = mime_content_type($filePath) ?: 'image/jpeg';
            return response()->file($filePath, [
                'Content-Type' => $mime,
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Methods' => 'GET, OPTIONS',
                'Cache-Control' => 'public, max-age=604800',
            ]);
        }
    }

    abort(404, 'Avatar not found');
})->where('path', '.*');