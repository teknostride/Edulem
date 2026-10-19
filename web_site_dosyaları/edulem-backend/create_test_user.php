<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "Creating test user...\n";

try {
    $user = new User();
    $user->name = 'Test User';
    $user->email = 'test@test.com';
    $user->password = Hash::make('password');
    $user->username = 'testuser';
    $user->is_superadmin = true;
    $user->save();
    
    echo "User created: " . $user->id . "\n";
    echo "Email: " . $user->email . "\n";
    echo "Username: " . $user->username . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
