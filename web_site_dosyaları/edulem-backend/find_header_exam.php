<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$headerExam = \App\Models\OmrExam::whereJsonContains('merged_exam_ids', "6")
    ->orWhereJsonContains('merged_exam_ids', 6)
    ->first();

if ($headerExam) {
    echo "Found Header Exam: {$headerExam->name} (ID: {$headerExam->id})\n";
    echo "  Merged IDs: " . json_encode($headerExam->merged_exam_ids) . "\n";
    echo "  Share Roles: " . json_encode($headerExam->share_roles) . "\n";
    
    $student = \App\Models\Student::where('name', 'LIKE', "%ABDULKADİR SERT%")->first();
    if ($student) {
        $res = \App\Models\OmrResult::where('exam_id', $headerExam->id)->where('student_id', $student->id)->first();
        if ($res) {
            echo "  Abdulkadir Sert Result for Header:\n";
            echo "    Net: {$res->total_net}, Point: {$res->total_point}\n";
        } else {
            echo "  No result row for Abdulkadir Sert in Header Exam.\n";
        }
    }
} else {
    echo "No Header Exam found containing exam ID 6.\n";
}
