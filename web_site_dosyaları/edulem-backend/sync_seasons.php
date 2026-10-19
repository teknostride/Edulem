<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Season;
use App\Models\Student;

$season = Season::where('name', '2025-2026')->first();
if ($season) {
    Season::where('tenant_id', $season->tenant_id)->where('id', '!=', $season->id)->update(['is_active' => false]);
    $season->update(['is_active' => true]);
    $count = Student::where('tenant_id', $season->tenant_id)->update(['season_id' => $season->id]);
    echo "Updated $count students to season {$season->name} (ID: {$season->id})\n";
} else {
    echo "Season 2025-2026 not found.\n";
}
