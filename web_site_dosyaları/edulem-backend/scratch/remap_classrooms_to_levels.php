<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Classroom;
use App\Models\EducationLevel;

$seasons = [10, 11];

foreach ($seasons as $seasonId) {
    echo "Fixing Season ID: $seasonId\n";
    
    // Get levels in this season
    $levels = EducationLevel::withoutGlobalScopes()->where('season_id', $seasonId)->get();
    
    foreach ($levels as $level) {
        // Find classrooms that SHOULD belong to this level but are using the OLD ID (from Season 1)
        // We match by Name because that's how we copied them.
        
        // Find the source level ID (from Season 1)
        $sourceLevel = EducationLevel::withoutGlobalScopes()
            ->where('season_id', 1)
            ->where('name', $level->name)
            ->first();
            
        if ($sourceLevel) {
            $updated = Classroom::withoutGlobalScopes()
                ->where('season_id', $seasonId)
                ->where(function($q) use ($sourceLevel) {
                    $q->where('education_level_id', $sourceLevel->id)
                      ->orWhere('grade_level', (string)$sourceLevel->id);
                })
                ->update([
                    'education_level_id' => $level->id,
                    'grade_level' => (string)$level->id
                ]);
                
            echo "  Updated $updated classrooms to level: {$level->name} (New ID: {$level->id}, Old ID: {$sourceLevel->id})\n";
        }
    }
}

echo "Done.\n";
