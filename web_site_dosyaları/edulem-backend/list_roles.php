<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$roles = \App\Models\Role::select('id', 'name')->get();
foreach ($roles as $role) {
    echo 'ID: ' . $role->id . ' - Name: ' . $role->name . "\n";
}
