<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('role_id', 5)->first();
if (!$user) {
    echo "No teacher found.\n";
    exit;
}
echo "Teacher ID: " . $user->id . "\n";
$canView = $user->can('viewAny', \App\Models\DutySchedule::class);
echo "Can view schedules: " . ($canView ? 'Yes' : 'No') . "\n";
