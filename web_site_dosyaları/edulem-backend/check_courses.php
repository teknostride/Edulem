<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$exams = \App\Models\OmrExam::with('examCourses')->get();
foreach($exams as $e) {
    echo "Exam {$e->id}: {$e->name} | merged: " . json_encode($e->merged_exam_ids) . "\n";
    foreach($e->examCourses as $ec) {
        echo "  - Course {$ec->course_id}\n";
    }
}
