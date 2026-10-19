<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;

$seasons = [10, 11]; // Future seasons
$sourceClassrooms = Classroom::withoutGlobalScopes()->whereIn('id', [49, 48])->get();

foreach ($seasons as $seasonId) {
    foreach ($sourceClassrooms as $source) {
        // Check if already exists in target season (just in case)
        $exists = Classroom::withoutGlobalScopes()
            ->where('season_id', $seasonId)
            ->where('name', $source->name)
            ->exists();
            
        if (!$exists) {
            $new = $source->replicate(['students_count']);
            $new->season_id = $seasonId;
            $new->save();
            echo "Restored $source->name to Season $seasonId\n";
        }
    }
}
