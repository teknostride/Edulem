<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $roles = \App\Models\Role::where('name', 'like', '%mudur%')
        ->orWhere('display_name', 'like', '%müdür%')
        ->get(['id', 'name', 'display_name']);
    
    echo "ROLES:\n";
    foreach ($roles as $role) {
        echo "ID: {$role->id}, Name: {$role->name}, Display Name: {$role->display_name}\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage();
}
