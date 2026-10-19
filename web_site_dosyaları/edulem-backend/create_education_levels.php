<?php
// Insert test education levels
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Http\Kernel');

use App\Models\EducationLevel, App\Models\Tenant;

$tenant = Tenant::first();
if (!$tenant) {
    echo "No tenant found!\n";
    exit;
}

$levels = [
    ['name' => 'Ana Okulu', 'code' => 'AO'],
    ['name' => 'İlkokul', 'code' => 'IO'],
    ['name' => 'Ortaokul', 'code' => 'OO'],
    ['name' => 'Lise', 'code' => 'L'],
];

foreach ($levels as $level) {
    $existing = EducationLevel::where('tenant_id', $tenant->id)
        ->where('code', $level['code'])
        ->first();
    
    if (!$existing) {
        EducationLevel::create([
            'tenant_id' => $tenant->id,
            'name' => $level['name'],
            'code' => $level['code'],
            'sort_order' => count(EducationLevel::where('tenant_id', $tenant->id)->get()),
        ]);
        echo "✓ Created: {$level['name']}\n";
    } else {
        echo "- Already exists: {$level['name']}\n";
    }
}

echo "\nTotal education levels: " . EducationLevel::where('tenant_id', $tenant->id)->count() . "\n";
?>
