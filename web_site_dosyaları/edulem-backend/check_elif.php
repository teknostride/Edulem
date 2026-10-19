<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$results = \App\Models\OmrResult::where('student_id', 4062)->get()->toArray();
file_put_contents('elif_results.txt', print_r($results, true));
echo "Saved.\n";
