<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$studentName = "ABDULKADİR SERT";
$student = \App\Models\Student::where('name', 'LIKE', "%{$studentName}%")->first();
$output = "";

if (!$student) {
    $output .= "Student not found.\n";
} else {
    $output .= "Student: {$student->name} (ID: {$student->id})\n\n";

    $results = \App\Models\OmrResult::where('student_id', $student->id)->with('exam')->get();
    foreach ($results as $r) {
        $output .= "Exam: {$r->exam->name} (ID: {$r->exam_id})\n";
        $output .= "  Total Net: {$r->total_net}\n";
        $output .= "  Total Point: {$r->total_point}\n";
        $output .= "  Share Roles: " . json_encode($r->exam->share_roles) . "\n";
        $output .= "  Merged Exam IDs: " . json_encode($r->exam->merged_exam_ids) . "\n";
        $output .= "-------------------\n";
    }

    $sessions = \App\Models\OmrSession::all();
    foreach ($sessions as $s) {
        $ids = (array) ($s->exam_ids ?? []);
        $subResults = \App\Models\OmrResult::whereIn('exam_id', $ids)->where('student_id', $student->id)->get();
        if ($subResults->isNotEmpty()) {
            $output .= "Session: {$s->name} (ID: {$s->id})\n";
            $output .= "  Exam IDs: " . json_encode($ids) . "\n";
            foreach ($subResults as $sr) {
                $output .= "    Sub-Exam: {$sr->exam->name} (ID: {$sr->exam_id}) - Net: {$sr->total_net}, Point: {$sr->total_point}\n";
            }
            $output .= "  Total Sum Point: " . $subResults->sum('total_point') . "\n";
            $output .= "-------------------\n";
        }
    }
}

file_put_contents('student_debug.txt', $output);
echo "Output saved to student_debug.txt\n";
