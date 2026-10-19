<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$results = \App\Models\MeasurementTrialResult::where('student_id', 6035)->with('trial')->get();
foreach ($results as $r) {
    echo "Trial: {$r->trial->name} | Net: {$r->net}\n";
}
