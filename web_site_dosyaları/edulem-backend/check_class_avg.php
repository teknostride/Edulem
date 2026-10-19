<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$student = \App\Models\Student::find(6035);
$classId = $student->classroom_id;
$className = $student->classroom?->name;

$results = \App\Models\OmrResult::whereIn('exam_id', [6, 7])
    ->whereHas('student', fn($q) => $q->where('classroom_id', $classId))
    ->get()
    ->groupBy('student_id')
    ->map(fn($r) => $r->sum('total_point'));

$avg = $results->avg();

echo "Classroom: $className (ID: $classId)\n";
echo "Class Average Point for Exams 6+7: " . round($avg, 2) . "\n";
echo "Student 6035 (Abdulkadir) Point: " . \App\Models\OmrResult::whereIn('exam_id', [6, 7])->where('student_id', 6035)->sum('total_point') . "\n";
