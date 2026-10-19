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