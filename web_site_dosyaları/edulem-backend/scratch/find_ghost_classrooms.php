<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;

$cs = Classroom::withoutGlobalScopes()->where('season_id', 1)
    ->where(function($q) { 
        $q->where('grade_level', '5')->orWhere('education_level_id', 5); 
    })->get();

echo "Found " . $cs->count() . " ghost classrooms:\n";
foreach($cs as $c) {
    echo "ID: {$c->id}, Name: {$c->name}, Grade Level: {$c->grade_level}\n";
}
