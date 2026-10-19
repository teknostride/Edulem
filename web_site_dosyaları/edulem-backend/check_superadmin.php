<?php
// Check user is_superadmin
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

// Get users with is_superadmin
$result = $mysqli->query("SELECT id, name, is_superadmin, tenant_id FROM users WHERE is_superadmin = 1");
echo "=== SUPERADMIN USERS ===\n";
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Name: {$row['name']}, SuperAdmin: {$row['is_superadmin']}, Tenant: {$row['tenant_id']}\n";
    }
} else {
    echo "No superadmin users found\n";
}

// Check token owner
$mysql2 = new mysqli("localhost", "root", "", "premium_edu");
$result = $mysql2->query("SELECT id, name, is_superadmin FROM users WHERE id = 13");
echo "\n=== USER ID 13 ===\n";
if ($result && $row = $result->fetch_assoc()) {
    echo "Name: {$row['name']}, SuperAdmin: {$row['is_superadmin']}\n";
}

$mysqli->close();
$mysql2->close();
?>
