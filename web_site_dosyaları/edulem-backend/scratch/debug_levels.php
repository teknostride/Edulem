<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\EducationLevel;

$seasonId = 11;
$classrooms = Classroom::withoutGlobalScopes()->where('season_id', $seasonId)->get();

$levels = $classrooms->map(function($c) {
    return $c->education_level_id ?: $c->grade_level;
})->unique();

echo "Unique levels in classrooms for season $seasonId:\n";
foreach ($levels as $l) {
    $levelModel = EducationLevel::withoutGlobalScopes()->find($l);
    echo "- Value: $l, Name: " . ($levelModel ? $levelModel->name : 'NOT FOUND') . "\n";
}

$allLevels = EducationLevel::withoutGlobalScopes()->where('season_id', $seasonId)->get();
echo "\nEducation levels in season $seasonId:\n";
foreach ($allLevels as $l) {
    echo "- ID: {$l->id}, Name: {$l->name}\n";
}
