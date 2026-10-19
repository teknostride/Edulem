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

echo "Checking if user is Branch Manager...\n";
$managedBranches = $user->managedBranches()->exists();
echo "Has managedBranches: " . ($managedBranches ? 'YES' : 'NO') . "\n";

if ($managedBranches) {
    $branches = $user->managedBranches()->pluck('id')->toArray();
    echo "Managed Branch IDs: " . json_encode($branches) . "\n";
}
