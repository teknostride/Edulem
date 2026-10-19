<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Routes...\n";

try {
    $routes = $app->router->getRoutes();
    
    foreach ($routes as $route) {
        $uri = $route->uri();
        if (strpos($uri, 'auth') !== false) {
            echo "Found auth route: " . $uri . "\n";
            echo "Methods: " . implode(', ', $route->methods()) . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
