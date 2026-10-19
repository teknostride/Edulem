<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;

$cs = Classroom::withoutGlobalScopes()->where('season_id', 11)->get();
echo "Total classrooms in Season 11: " . $cs->count() . "\n";
foreach($cs as $c) {
    echo "ID: {$c->id}, Name: {$c->name}, Level: {$c->grade_level}\n";
}
