<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentId = \App\Models\Student::where('name', 'ELİF RANA YALDIR')->value('id');
$results = \App\Models\OmrResult::where('student_id', $studentId)->get();

echo "ELIF RANA YALDIR results:\n";
foreach($results as $r) {
    echo "Exam ID: {$r->exam_id}\n";
    echo "Courses: " . implode(', ', array_keys((array)($r->course_scores ?? []))) . "\n";
}
