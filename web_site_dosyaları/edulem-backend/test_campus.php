<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Campus API...\n";

try {
    // Test campuses route
    echo "Testing /api/v1/campuses...\n";
    $request = \Illuminate\Http\Request::create('/api/v1/campuses', 'GET');
    $response = $app->handle($request);
    echo "Status: " . $response->getStatusCode() . "\n";
    
    if ($response->getStatusCode() == 200) {
        $data = json_decode($response->getContent(), true);
        echo "Success! Found " . count($data['data']['campuses']) . " campuses\n";
    } else {
        echo "Error: " . $response->getContent() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
