<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Classroom API...\n";

try {
    // Test classrooms route
    echo "Testing /api/v1/classrooms...\n";
    $request = \Illuminate\Http\Request::create('/api/v1/classrooms', 'GET');
    $response = $app->handle($request);
    echo "Status: " . $response->getStatusCode() . "\n";
    
    if ($response->getStatusCode() == 200) {
        $data = json_decode($response->getContent(), true);
        echo "Success! Found " . count($data['data']) . " classrooms\n";
    } else {
        echo "Error: " . $response->getContent() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
