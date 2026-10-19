<?php
// Insert education levels for tenant 17 with unique codes
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

$tenant_id = 17;
$levels = [
    ['name' => 'Ana Okulu', 'code' => 'AO_17', 'sort' => 1],
    ['name' => 'İlkokul', 'code' => 'IO_17', 'sort' => 2],
    ['name' => 'Ortaokul', 'code' => 'OO_17', 'sort' => 3],
    ['name' => 'Lise', 'code' => 'L_17', 'sort' => 4],
];

foreach ($levels as $level) {
    $name = $mysqli->real_escape_string($level['name']);
    $code = $mysqli->real_escape_string($level['code']);
    
    $sql = "INSERT INTO education_levels (tenant_id, name, code, sort_order, created_at, updated_at) 
            VALUES ($tenant_id, '$name', '$code', {$level['sort']}, NOW(), NOW())";
    
    if ($mysqli->query($sql)) {
        echo "✓ Created: {$level['name']} (Code: {$level['code']})\n";
    } else {
        echo "✗ Error: " . $mysqli->error . "\n";
    }
}

// Verify for tenant 17
$result = $mysqli->query("SELECT COUNT(*) as cnt FROM education_levels WHERE tenant_id = 17");
$row = $result->fetch_assoc();
echo "\nTotal for Tenant 17: " . $row['cnt'] . "\n";

$mysqli->close();
?>
