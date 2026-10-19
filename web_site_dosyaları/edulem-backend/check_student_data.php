<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentName = "Abdulkadir Sert";
$student = \App\Models\Student::where('name', 'LIKE', "%{$studentName}%")->first();

if (!$student) {
    echo "Student not found.\n";
    exit;
}

echo "Student: {$student->name} (ID: {$student->id})\n";

$results = \App\Models\OmrResult::where('student_id', $student->id)->with('exam')->get();

foreach ($results as $r) {
    echo "Exam: {$r->exam->name} (ID: {$r->exam_id})\n";
    echo "  Total Net: {$r->total_net}\n";
    echo "  Total Point: {$r->total_point}\n";
    echo "  Is Merged (Parent): " . (!empty($r->exam->merged_exam_ids) ? 'Yes' : 'No') . "\n";
    echo "-------------------\n";
}
