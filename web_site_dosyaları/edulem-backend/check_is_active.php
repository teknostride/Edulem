<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach(\App\Models\Season::all() as $s) {
    echo $s->id . ': ' . ($s->is_active ? 'true' : 'false') . "\n";
}
