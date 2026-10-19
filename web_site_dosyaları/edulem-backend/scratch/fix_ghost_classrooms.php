<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;

// Move ghost classrooms (ID 34, 35) to Lise (Level ID 6)
$affected = Classroom::withoutGlobalScopes()
    ->whereIn('id', [34, 35])
    ->update(['grade_level' => '6', 'education_level_id' => 6]);

echo "Updated $affected classrooms to Level ID 6 (Lise).\n";
