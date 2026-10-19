<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$seasons = \App\Models\Season::withCount(['students' => function ($query) {
    $query->withoutGlobalScope(\App\Scopes\SeasonScope::class);
}])->get();

foreach($seasons as $s) {
    echo "Season: {$s->name} | Active: " . ($s->is_active ? 'YES' : 'NO') . " | Students: {$s->students_count}\n";
}
