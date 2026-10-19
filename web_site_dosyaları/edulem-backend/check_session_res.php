<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentId = 6035;
$session = \App\Models\OmrSession::find(1);
$results = $session->combined_results ?? [];

$found = null;
foreach ($results as $r) {
    $r = (array)$r;
    if ((int)($r['student_id'] ?? 0) === $studentId) {
        $found = $r;
        break;
    }
}

if ($found) {
    echo "Found session result for Abdulkadir Sert:\n";
    print_r($found);
} else {
    echo "No session result found for Abdulkadir Sert in session 1.\n";
    echo "Total entries in session: " . count($results) . "\n";
}
