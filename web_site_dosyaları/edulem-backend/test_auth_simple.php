<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Auth API Simple...\n";

try {
    // Test auth login route
    echo "Testing /api/v1/auth/login...\n";
    $request = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', [
        'email' => 'test@test.com',
        'password' => 'password'
    ]);
    $response = $app->handle($request);
    echo "Status: " . $response->getStatusCode() . "\n";
    
    if ($response->getStatusCode() == 200) {
        $data = json_decode($response->getContent(), true);
        echo "Success! Login successful\n";
        echo "User: " . $data['data']['user']['name'] . "\n";
        echo "Token: " . substr($data['data']['token'], 0, 20) . "...\n";
    } else {
        echo "Error: " . $response->getContent() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
