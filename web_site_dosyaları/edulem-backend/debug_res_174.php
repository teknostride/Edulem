<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$r = \App\Models\OmrResult::with('exam.examCourses.course')->find(174);
echo "Exam: {$r->exam->name}\n";
echo "Total Net: {$r->total_net} | Total Point: {$r->total_point}\n";

$scores = $r->course_scores;
foreach ($scores as $cid => $s) {
    $ec = $r->exam->examCourses->where('course_id', $cid)->first();
    $cname = $ec->course->name ?? "Unknown";
    $coeff = $ec->coefficient ?? 1.0;
    echo "Course: $cname (ID: $cid) | Net: {$s['net']} | Point: {$s['point']} | Coeff: $coeff | Calculated: " . ($s['net'] * $coeff) . "\n";
}
