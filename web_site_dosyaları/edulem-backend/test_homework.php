<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $user = \App\Models\User::whereHas('role', function($q) {
        $q->where('name', 'Kurucu');
    })->first();

    if (!$user) {
        $user = \App\Models\User::first();
    }
    
    if (!$user) {
        echo "No user found.\n";
        exit;
    }

    auth()->login($user);
    $controller = app(\App\Http\Controllers\HomeworkController::class);
    request()->merge(['page' => 1, 'per_page' => 1]);
    
    $response = $controller->index();
    echo "Success!\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
