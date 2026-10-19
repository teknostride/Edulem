<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = \App\Models\OmrResult::where('exam_id', 10)->count();
$any = \App\Models\OmrResult::where('exam_id', 10)->first();

echo "Count for 10: $count\n";
if ($any) {
    echo "Sample result for 10:\n";
    print_r($any->toArray());
}
