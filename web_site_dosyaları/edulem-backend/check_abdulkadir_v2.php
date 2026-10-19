<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = \App\Models\Student::where('name', 'LIKE', '%ABDULKADİR SERT%')->first();
if ($student) {
    echo "Abdulkadir Tenant: {$student->tenant_id}\n";
    $exams = \App\Models\OmrResult::where('student_id', $student->id)->pluck('exam_id');
    echo "Exams: " . json_encode($exams) . "\n";
} else {
    echo "Student not found.\n";
}
