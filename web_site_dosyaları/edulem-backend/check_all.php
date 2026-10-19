<?php
// Check detailed education levels and tenants
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

echo "=== EDUCATION LEVELS ===\n";
$result = $mysqli->query("SELECT id, tenant_id, name FROM education_levels");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Tenant: {$row['tenant_id']}, Name: {$row['name']}\n";
    }
} else {
    echo "No education levels found\n";
}

echo "\n=== TENANTS ===\n";
$result = $mysqli->query("SELECT id, name FROM tenants");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Name: {$row['name']}\n";
    }
}

echo "\n=== USERS ===\n";
$result = $mysqli->query("SELECT id, name, tenant_id FROM users");
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "ID: {$row['id']}, Name: {$row['name']}, Tenant: {$row['tenant_id']}\n";
    }
}

$mysqli->close();
?>
