<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

use App\Models\User;

echo "Checking users...\n";

try {
    $users = User::all();
    
    foreach ($users as $user) {
        echo "Email: " . $user->email . ", Name: " . $user->name . ", ID: " . $user->id . "\n";
    }
    
    if ($users->count() == 0) {
        echo "No users found in database.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
