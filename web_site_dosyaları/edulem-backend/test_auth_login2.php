<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$tcNo = '12345678901'; // Try to find a guardian TC or student TC
$guardians = App\Models\Guardian::whereNotNull('password')->take(1)->get();
if($guardians->isEmpty()) {
    echo "No guardian with password.\n";
} else {
    $g = $guardians->first();
    echo "Guardian found: " . $g->tc_no . "\n";
    $students = $g->students;
    if($students->isNotEmpty()) {
        echo "Student TC: " . $students->first()->tc_no . "\n";
    }
}
