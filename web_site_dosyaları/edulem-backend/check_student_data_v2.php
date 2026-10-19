<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentName = "ABDULKADİR SERT";
$student = \App\Models\Student::where('name', 'LIKE', "%{$studentName}%")->first();

if (!$student) {
    echo "Student not found.\n";
    exit;
}

echo "Student: {$student->name} (ID: {$student->id})\n\n";

$results = \App\Models\OmrResult::where('student_id', $student->id)->with('exam')->get();

foreach ($results as $r) {
    echo "Exam: {$r->exam->name} (ID: {$r->exam_id})\n";
    echo "  Total Net: {$r->total_net}\n";
    echo "  Total Point: {$r->total_point}\n";
    echo "  Share Roles: " . json_encode($r->exam->share_roles) . "\n";
    echo "  Merged Exam IDs: " . json_encode($r->exam->merged_exam_ids) . "\n";
    echo "-------------------\n";
}

$sessions = \App\Models\OmrSession::all();
foreach ($sessions as $s) {
    $ids = (array) ($s->exam_ids ?? []);
    $hasRes = \App\Models\OmrResult::whereIn('exam_id', $ids)->where('student_id', $student->id)->exists();
    if ($hasRes) {
        echo "Session: {$s->name} (ID: {$s->id})\n";
        echo "  Exam IDs: " . json_encode($ids) . "\n";
        $subResults = \App\Models\OmrResult::whereIn('exam_id', $ids)->where('student_id', $student->id)->get();
        foreach ($subResults as $sr) {
            echo "    Sub-Exam: {$sr->exam->name} - Net: {$sr->total_net}, Point: {$sr->total_point}\n";
        }
        echo "  Total Sum Point: " . $subResults->sum('total_point') . "\n";
        echo "-------------------\n";
    }
}
