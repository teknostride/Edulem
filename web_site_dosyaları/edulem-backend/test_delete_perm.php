<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';
$personalAccessToken = PersonalAccessToken::findToken($token);

if (!$personalAccessToken) {
    echo "Token not found!\n";
    exit(1);
}

$user = $personalAccessToken->tokenable;
echo "=== DELETE CLASSROOM TEST ===\n";
echo "User: {$user->name} (ID: {$user->id})\n";
echo "Role: {$user->role->name}\n";

// Test permission check like middleware does
$permission = 'academic.delete';
echo "\nTesting permission: $permission\n";
echo "hasPermission() result: " . ($user->hasPermission($permission) ? 'TRUE' : 'FALSE') . "\n";

// Detailed check
echo "\nDetailed permission check:\n";
if (!$user->role) {
    echo "  - User has no role!\n";
} else {
    $exists = $user->role->permissions()->where('name', $permission)->exists();
    echo "  - Role permissions exist for '$permission': " . ($exists ? 'YES' : 'NO') . "\n";
    
    // List all permissions
    $perms = $user->role->permissions()->pluck('name')->toArray();
    echo "  - Total permissions: " . count($perms) . "\n";
    echo "  - Has 'academic.delete' in list: " . (in_array('academic.delete', $perms) ? 'YES' : 'NO') . "\n";
}
