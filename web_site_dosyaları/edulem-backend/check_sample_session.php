<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$session = \App\Models\OmrSession::find(1);
$results = $session->combined_results ?? [];

$output = "Total in session: " . count($results) . "\n\n";

if (count($results) > 0) {
    $first = (array)$results[0];
    $output .= "Example entry:\n" . print_r($first, true) . "\n";
} else {
    $output .= "Session results are empty.\n";
}

file_put_contents('sample_session.txt', $output);
echo "Done.\n";
