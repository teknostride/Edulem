<?php
// Simulate Laravel app
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

// Get token from header - token: 40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d
$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';

// Find user by token
$personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
if (!$personalAccessToken) {
    echo "Token not found!\n";
    exit(1);
}

$user = $personalAccessToken->tokenable;
echo "User ID: " . $user->id . "\n";
echo "User Name: " . $user->name . "\n";
echo "Is SuperAdmin: " . ($user->is_superadmin ? 'YES' : 'NO') . "\n";
echo "Role ID: " . $user->role_id . "\n";
if ($user->role) {
    echo "Role Name: " . $user->role->name . "\n";
    $perms = $user->role->permissions()->pluck('name')->toArray();
    echo "Permissions: " . json_encode($perms) . "\n";
    echo "Has academic.delete: " . ($user->hasPermission('academic.delete') ? 'YES' : 'NO') . "\n";
} else {
    echo "Role: NONE\n";
}
