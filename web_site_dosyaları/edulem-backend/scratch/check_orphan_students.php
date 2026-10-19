<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\Student;
use App\Models\EducationLevel;

$cs = Classroom::withoutGlobalScopes()->where('season_id', 11)->get();
$orphans = [];

foreach ($cs as $c) {
    $levelId = $c->education_level_id ?: $c->grade_level;
    if (!EducationLevel::withoutGlobalScopes()->find($levelId)) {
        $orphans[] = $c;
    }
}

echo "Found " . count($orphans) . " orphan classrooms in Season 11.\n";
foreach ($orphans as $c) {
    $studentCount = Student::withoutGlobalScopes()->where('classroom_id', $c->id)->count();
    echo "ID: {$c->id}, Name: {$c->name}, Students: $studentCount\n";
}
