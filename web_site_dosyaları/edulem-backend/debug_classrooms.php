<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Classroom;
use Illuminate\Support\Facades\DB;

echo "=== Debugging Classroom tenant_id ===\n\n";

// Check for null tenant_id
$nullTenantCount = Classroom::whereNull('tenant_id')->count();
echo "Classrooms with NULL tenant_id: $nullTenantCount\n";

// Get all classrooms
$allClassrooms = Classroom::with('branch')->get();
echo "Total classrooms: " . count($allClassrooms) . "\n\n";

echo "Classroom details:\n";
foreach ($allClassrooms as $classroom) {
    $branchTenant = $classroom->branch?->campus?->tenant_id ?? 'NO BRANCH';
    echo "ID: {$classroom->id}, Name: {$classroom->name}, Tenant ID: " . ($classroom->tenant_id ?? 'NULL') . ", Branch Campus Tenant: $branchTenant\n";
}

// Check the specific classroom from logs (ID 13)
echo "\n=== Checking Classroom ID 13 ===\n";
$classroom13 = Classroom::find(13);
if ($classroom13) {
    dd([
        'id' => $classroom13->id,
        'name' => $classroom13->name,
        'tenant_id' => $classroom13->tenant_id,
        'branch_id' => $classroom13->branch_id,
        'branch' => $classroom13->branch,
        'branch_campus' => $classroom13->branch?->campus,
    ]);
} else {
    echo "Classroom 13 not found\n";
}
