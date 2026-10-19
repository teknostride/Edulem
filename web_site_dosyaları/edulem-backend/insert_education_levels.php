<?php
// Direct SQL Insert for education levels

$mysqli = new mysqli("localhost", "root", "", "premium_edu");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Get tenant ID
$result = $mysqli->query("SELECT id FROM tenants LIMIT 1");
if ($result && $row = $result->fetch_assoc()) {
    $tenant_id = $row['id'];
} else {
    die("No tenant found");
}

$levels = [
    ['name' => 'Ana Okulu', 'code' => 'AO', 'sort' => 1],
    ['name' => 'İlkokul', 'code' => 'IO', 'sort' => 2],
    ['name' => 'Ortaokul', 'code' => 'OO', 'sort' => 3],
    ['name' => 'Lise', 'code' => 'L', 'sort' => 4],
];

$created = 0;
foreach ($levels as $level) {
    $name = $mysqli->real_escape_string($level['name']);
    $code = $mysqli->real_escape_string($level['code']);
    
    // Check if exists
    $checkSql = "SELECT id FROM education_levels WHERE tenant_id = $tenant_id AND code = '$code'";
    $checkResult = $mysqli->query($checkSql);
    
    if ($checkResult && $checkResult->num_rows === 0) {
        $sql = "INSERT INTO education_levels (tenant_id, name, code, sort_order, created_at, updated_at) 
                VALUES ($tenant_id, '$name', '$code', {$level['sort']}, NOW(), NOW())";
        
        if ($mysqli->query($sql)) {
            echo "✓ Created: {$level['name']}\n";
            $created++;
        } else {
            echo "✗ Error creating {$level['name']}: " . $mysqli->error . "\n";
        }
    } else {
        echo "- Already exists: {$level['name']}\n";
    }
}

$countResult = $mysqli->query("SELECT COUNT(*) as cnt FROM education_levels WHERE tenant_id = $tenant_id");
$countRow = $countResult->fetch_assoc();
echo "\nTotal education levels: " . $countRow['cnt'] . "\n";
echo "Created: $created\n";

$mysqli->close();
?>
