<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EducationLevel;

$ids = [19, 20, 21, 22];
foreach ($ids as $id) {
    $l = EducationLevel::withoutGlobalScopes()->find($id);
    if ($l) {
        echo "ID: $id, Name: {$l->name}, Season: {$l->season_id}\n";
    } else {
        echo "ID: $id, NOT FOUND\n";
    }
}
