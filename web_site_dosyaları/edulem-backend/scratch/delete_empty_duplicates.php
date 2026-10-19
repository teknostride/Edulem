<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\Student;

$names = ['11-EA', '12-EA'];
$deletedCount = 0;

foreach ($names as $name) {
    $cs = Classroom::withoutGlobalScopes()->where('name', $name)->get();
    foreach ($cs as $c) {
        $studentCount = Student::withoutGlobalScopes()->where('classroom_id', $c->id)->count();
        if ($studentCount === 0) {
            $c->delete();
            echo "Deleted empty classroom: $name (ID: {$c->id}, Season: " . ($c->season_id ?? 'NULL') . ")\n";
            $deletedCount++;
        }
    }
}

echo "\nTotal deleted: $deletedCount\n";
