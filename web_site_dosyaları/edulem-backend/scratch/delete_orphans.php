<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\EducationLevel;

$cs = Classroom::withoutGlobalScopes()->where('season_id', 11)->get();
$deleted = 0;

foreach ($cs as $c) {
    $levelId = $c->education_level_id ?: $c->grade_level;
    if (!EducationLevel::withoutGlobalScopes()->find($levelId)) {
        $c->delete();
        $deleted++;
    }
}

echo "Deleted $deleted orphan classrooms in Season 11.\n";
