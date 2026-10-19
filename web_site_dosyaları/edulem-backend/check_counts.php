<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Exam 6 count: " . \App\Models\OmrResult::where('exam_id', 6)->count() . "\n";
echo "Exam 7 count: " . \App\Models\OmrResult::where('exam_id', 7)->count() . "\n";
