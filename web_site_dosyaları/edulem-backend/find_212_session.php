<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$ss = \App\Models\OmrSession::all();
foreach ($ss as $s) {
    $json = json_encode($s->combined_results);
    if (str_contains($json, '212')) {
        echo "Session ID: {$s->id} | Name: {$s->name} contains 212\n";
        // Find who has it
        foreach ($s->combined_results as $cr) {
            $cr = (array)$cr;
            if (str_contains((string)($cr['total_point'] ?? ''), '212') || str_contains((string)($cr['total_net'] ?? ''), '212')) {
                echo "  Found match: Student ID: " . ($cr['student_id'] ?? '?') . " | Name: " . ($cr['student_name'] ?? '?') . " | Point: " . ($cr['total_point'] ?? '?') . "\n";
            }
        }
    }
}
