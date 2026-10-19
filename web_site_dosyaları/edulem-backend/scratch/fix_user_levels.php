<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

use App\Models\User;
use App\Models\EducationLevel;
use App\Models\Season;

$user = User::where('name', 'like', '%Mustafa Görkem%')->first();
if ($user) {
    echo "Found user: " . $user->name . "\n";
    $activeSeason = Season::where('is_active', true)->first();
    if ($activeSeason) {
        $activeLevels = EducationLevel::where('season_id', $activeSeason->id)->pluck('id')->toArray();
        echo "Active season: " . $activeSeason->name . " (ID: " . $activeSeason->id . ")\n";
        echo "Active levels: " . implode(', ', $activeLevels) . "\n";
        
        $currentIds = $user->education_level_ids ?? [];
        echo "Current user IDs: " . implode(', ', $currentIds) . "\n";
        
        $newIds = array_unique(array_merge($currentIds, $activeLevels));
        $user->education_level_ids = $newIds;
        $user->save();
        
        echo "Updated user education_level_ids to: " . implode(', ', $newIds) . "\n";
    } else {
        echo "No active season found.\n";
    }
} else {
    echo "User not found.\n";
}
