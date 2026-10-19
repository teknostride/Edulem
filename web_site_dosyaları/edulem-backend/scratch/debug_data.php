<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EducationLevel;
use App\Models\Season;
use App\Models\Classroom;

echo "--- Seasons ---\n";
$seasons = Season::all();
foreach ($seasons as $s) {
    echo "ID: {$s->id}, Name: {$s->name}, Active: " . ($s->is_active ? 'Yes' : 'No') . "\n";
}

echo "\n--- Education Levels (without scopes) ---\n";
$levels = EducationLevel::withoutGlobalScopes()->get();
foreach ($levels as $l) {
    echo "ID: {$l->id}, Name: {$l->name}, SeasonID: " . ($l->season_id ?? 'NULL') . "\n";
}

echo "\n--- Classrooms (without scopes) ---\n";
$classrooms = Classroom::withoutGlobalScopes()->get();
echo "Total classrooms: " . $classrooms->count() . "\n";
foreach ($classrooms->take(5) as $c) {
    echo "ID: {$c->id}, Name: {$c->name}, SeasonID: " . ($c->season_id ?? 'NULL') . "\n";
}
