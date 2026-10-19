<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Laravel\Sanctum\PersonalAccessToken;

$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';
$personalAccessToken = PersonalAccessToken::findToken($token);

if (!$personalAccessToken) {
    echo "Token not found!\n";
    exit(1);
}

$user = $personalAccessToken->tokenable;
$classroom = \App\Models\Classroom::find(15);

echo "USER DETAILS:\n";
echo "- ID: " . $user->id . "\n";
echo "- Tenant ID: " . $user->tenant_id . "\n";
echo "- Role ID: " . $user->role_id . "\n";
echo "- Role Name: " . ($user->role ? $user->role->name : 'NO ROLE') . "\n";

if ($user->role) {
    echo "\nROLE DETAILS:\n";
    echo "- Role ID: " . $user->role->id . "\n";
    echo "- Role Tenant ID: " . $user->role->tenant_id . "\n";
}

echo "\nCLASSROOM DETAILS:\n";
echo "- ID: " . $classroom->id . "\n";
echo "- Tenant ID: " . $classroom->tenant_id . "\n";

echo "\nCOMPARISON:\n";
echo "- User Tenant == Classroom Tenant? " . ($user->tenant_id === $classroom->tenant_id ? 'YES' : 'NO') . "\n";
