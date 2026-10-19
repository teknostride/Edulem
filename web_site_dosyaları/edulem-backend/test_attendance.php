<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$c1 = \App\Models\Classroom::find(35);
$c2 = \App\Models\Classroom::find(34);
echo "Classroom 35 - grade_level: " . $c1->grade_level . " | education_level_id: " . $c1->education_level_id . " | campus_id: " . $c1->campus_id . "\n";
echo "Classroom 34 - grade_level: " . $c2->grade_level . " | education_level_id: " . $c2->education_level_id . " | campus_id: " . $c2->campus_id . "\n";
