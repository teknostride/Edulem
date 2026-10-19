<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$results = \App\Models\OmrResult::whereBetween('total_point', [210, 215])->with('student')->get();
foreach ($results as $r) {
    echo "ID: {$r->id} | Student: {$r->student->name} (ID: {$r->student_id}) | Exam: {$r->exam_id} | Point: {$r->total_point}\n";
}
