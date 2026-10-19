<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$coeffs = \App\Models\OmrExamCourse::whereIn('exam_id', [6, 7])->get()->toArray();
file_put_contents('coeffs.txt', print_r($coeffs, true));
echo "Saved.\n";
