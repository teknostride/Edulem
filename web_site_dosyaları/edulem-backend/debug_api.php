<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Permission API...\n";

try {
    // Test model directly
    echo "Testing Permission model...\n";
    $permissions = \App\Models\Permission::withCount('roles')->get();
    echo "Model test successful! Found " . $permissions->count() . " permissions.\n";
    
    // Test controller directly
    echo "\nTesting PermissionController...\n";
    $controller = new \App\Http\Controllers\PermissionController();
    $request = new \Illuminate\Http\Request();
    $response = $controller->index($request);
    echo "Controller test successful! Response: " . $response->getStatusCode() . "\n";
    echo "Response content: " . $response->getContent() . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
