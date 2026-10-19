<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\Student;

$names = ['11-EA', '12-EA'];

foreach ($names as $name) {
    echo "--- Checking: $name ---\n";
    $cs = Classroom::withoutGlobalScopes()->where('name', $name)->get();
    foreach ($cs as $c) {
        $studentCount = Student::withoutGlobalScopes()->where('classroom_id', $c->id)->count();
        echo "ID: {$c->id}, Name: {$c->name}, SeasonID: " . ($c->season_id ?? 'NULL') . ", Level: {$c->grade_level}, Students: $studentCount\n";
    }
    echo "\n";
}
