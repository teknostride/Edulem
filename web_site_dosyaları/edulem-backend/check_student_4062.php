<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = \App\Models\Student::find(4062);
if ($student) {
    echo "Student 4062: {$student->name} | Tenant: {$student->tenant_id}\n";
    $results = \App\Models\OmrResult::where('student_id', 4062)->get(['exam_id', 'total_net', 'total_point'])->toArray();
    print_r($results);
} else {
    echo "Student 4062 not found.\n";
}
