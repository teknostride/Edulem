<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentId = 6035;
$results = \App\Models\OmrResult::where('student_id', $studentId)->with('exam')->get();

$out = "All results for student 6035:\n\n";
foreach ($results as $r) {
    $out .= "ID: {$r->id} | Exam ID: {$r->exam_id} | Name: {$r->exam->name}\n";
    $out .= "  Net: {$r->total_net} | Point: {$r->total_point}\n";
    $out .= "  Merged IDs in Exam: " . json_encode($r->exam->merged_exam_ids) . "\n";
    $out .= "-------------------\n";
}

file_put_contents('abdulkadir_results.txt', $out);
echo "Saved.\n";
