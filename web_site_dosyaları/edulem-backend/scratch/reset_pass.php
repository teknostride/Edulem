<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::whereHas('role', function($q) { $q->where('name', 'owner'); })->first();
if (!$user) {
    $user = User::first();
}

$user->password = Hash::make('password');
$user->save();

echo "USER: " . $user->email . "\n";
echo "PASS: password\n";
echo "ROLE: " . ($user->role ? $user->role->name : 'N/A') . "\n";
