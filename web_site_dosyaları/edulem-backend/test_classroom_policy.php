<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Classroom;
use Laravel\Sanctum\PersonalAccessToken;

$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';
$personalAccessToken = PersonalAccessToken::findToken($token);

if (!$personalAccessToken) {
    echo "Token not found!\n";
    exit(1);
}

$user = $personalAccessToken->tokenable;
$classroom = Classroom::find(15); // Silinemek istenen sınıf

echo "=== CLASSROOM POLICY DELETE CHECK ===\n";
echo "User ID: {$user->id}\n";
echo "User Name: {$user->name}\n";
echo "User tenant_id: {$user->tenant_id}\n";
echo "User Role: {$user->role->name}\n";
echo "User is_superadmin: " . ($user->is_superadmin ? 'YES' : 'NO') . "\n";

if ($classroom) {
    echo "\nClassroom ID: {$classroom->id}\n";
    echo "Classroom tenant_id: {$classroom->tenant_id}\n";
    echo "Classroom branch_id: {$classroom->branch_id}\n";
    
    // Policy checks
    echo "\n=== POLICY CHECK RESULTS ===\n";
    
    // SuperAdmin check
    if ($user->is_superadmin) {
        echo "✓ SuperAdmin: PASS\n";
    } else {
        echo "✗ SuperAdmin: Not superadmin\n";
    }
    
    // Tenant check
    if ($user->tenant_id !== $classroom->tenant_id) {
        echo "✗ Tenant Match: FAIL - user.tenant_id({$user->tenant_id}) !== classroom.tenant_id({$classroom->tenant_id})\n";
    } else {
        echo "✓ Tenant Match: PASS\n";
    }
    
    // Owner check
    if ($user->role && $user->role->name === 'owner') {
        echo "✓ Is Owner: YES\n";
        if ($user->tenant_id === $classroom->tenant_id) {
            echo "✓ Owner FINAL: PASS\n";
        } else {
            echo "✗ Owner FINAL: FAIL (tenant mismatch)\n";
        }
    } else {
        echo "✗ Is Owner: NO (role = {$user->role->name})\n";
    }
} else {
    echo "\nClassroom #15 not found!\n";
}
