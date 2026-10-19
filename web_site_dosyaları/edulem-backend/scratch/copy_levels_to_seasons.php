<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EducationLevel;
use App\Models\Season;

$sourceSeasonId = 1;
$targetSeasons = [10, 11];

$sourceLevels = EducationLevel::withoutGlobalScopes()->where('season_id', $sourceSeasonId)->get();

foreach ($targetSeasons as $targetId) {
    echo "Processing Season ID: $targetId\n";
    foreach ($sourceLevels as $source) {
        // Check if level with same name exists (or same ID if we wanted to preserve, but we should create new ones)
        $exists = EducationLevel::withoutGlobalScopes()
            ->where('season_id', $targetId)
            ->where('name', $source->name)
            ->exists();
            
        if (!$exists) {
            $new = $source->replicate();
            $new->season_id = $targetId;
            $new->save();
            echo "Copied level: {$new->name} to Season $targetId\n";
        }
    }
}

echo "Done.\n";
