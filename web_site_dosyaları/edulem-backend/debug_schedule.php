<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "Testing Schedule API...\n";

try {
    // Test model directly
    echo "Testing Schedule model...\n";
    $schedules = \App\Models\Schedule::with(['classroom', 'lesson', 'teacher'])->get();
    echo "Model test successful! Found " . $schedules->count() . " schedules.\n";
    
    // Test controller directly
    echo "\nTesting ScheduleController...\n";
    $controller = new \App\Http\Controllers\ScheduleController();
    $request = new \Illuminate\Http\Request();
    $response = $controller->index($request);
    echo "Controller test successful! Response: " . $response->getStatusCode() . "\n";
    echo "Response content: " . $response->getContent() . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
