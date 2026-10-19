<?php
// Insert education levels for all tenants
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

// Get all tenants
$tenantResult = $mysqli->query("SELECT id FROM tenants");
$levels = [
    ['name' => 'Ana Okulu', 'code' => 'AO', 'sort' => 1],
    ['name' => 'İlkokul', 'code' => 'IO', 'sort' => 2],
    ['name' => 'Ortaokul', 'code' => 'OO', 'sort' => 3],
    ['name' => 'Lise', 'code' => 'L', 'sort' => 4],
];

$created = 0;
$skipped = 0;

while ($tenant = $tenantResult->fetch_assoc()) {
    $tenant_id = $tenant['id'];
    
    foreach ($levels as $level) {
        $name = $mysqli->real_escape_string($level['name']);
        $code = $mysqli->real_escape_string($level['code']);
        
        // Check if already exists
        $checkSql = "SELECT id FROM education_levels WHERE tenant_id = $tenant_id AND code = '$code'";
        $checkResult = $mysqli->query($checkSql);
        
        if ($checkResult && $checkResult->num_rows === 0) {
            $sql = "INSERT INTO education_levels (tenant_id, name, code, sort_order, created_at, updated_at) 
                    VALUES ($tenant_id, '$name', '$code', {$level['sort']}, NOW(), NOW())";
            
            if ($mysqli->query($sql)) {
                $created++;
                echo "✓ Created for Tenant $tenant_id: {$level['name']}\n";
            } else {
                echo "✗ Error: " . $mysqli->error . "\n";
            }
        } else {
            $skipped++;
        }
    }
}

echo "\nCreated: $created\n";
echo "Skipped: $skipped\n";

// Verify
$total = $mysqli->query("SELECT COUNT(*) as cnt FROM education_levels");
$row = $total->fetch_assoc();
echo "Total in DB: " . $row['cnt'] . "\n";

$mysqli->close();
?>
