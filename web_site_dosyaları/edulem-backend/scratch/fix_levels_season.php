<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EducationLevel;
use App\Models\Season;
use App\Models\Classroom;

// 1. Get the active season (should be 2025-2026 based on previous debug)
$season = Season::where('is_active', true)->first();

if (!$season) {
    echo "No active season found. Aborting.\n";
    exit;
}

echo "Active Season: {$season->name} (ID: {$season->id})\n";

// 2. Link existing education levels to the active season
$levels = EducationLevel::withoutGlobalScopes()->whereNull('season_id')->get();
echo "Found " . $levels->count() . " levels with NULL season_id.\n";

foreach ($levels as $l) {
    $l->season_id = $season->id;
    $l->save();
    echo "Updated level: {$l->name}\n";
}

// 3. Optional: If there are classrooms that reference levels not in this season, that might be an issue.
// But for now, let's just fix the NULLs.

echo "Done.\n";
