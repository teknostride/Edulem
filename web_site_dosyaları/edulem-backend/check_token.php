<?php
// Check user with token
$mysqli = new mysqli("localhost", "root", "", "premium_edu");

// Get user by token
$token = '40|whmIoYXs2PZXTMeFPqI1migVB1lLY4ycdfSUgEXz8065af1d';

// Laravel Sanctum tokens are stored in personal_access_tokens table
$result = $mysqli->query("SELECT * FROM personal_access_tokens WHERE token = MD5('$token') LIMIT 1");

echo "Checking token in personal_access_tokens:\n";
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo "  Token Found:\n";
        echo "    ID: {$row['id']}\n";
        echo "    Tokenable ID: {$row['tokenable_id']}\n";
        echo "    Tokenable Type: {$row['tokenable_type']}\n";
        echo "    Name: {$row['name']}\n";
    }
} else {
    echo "  Token not found\n";
}

// Get users
$userResult = $mysqli->query("SELECT id, name, tenant_id FROM users LIMIT 3");
echo "\nUsers:\n";
if ($userResult && $userResult->num_rows > 0) {
    while ($row = $userResult->fetch_assoc()) {
        echo "  ID: {$row['id']}, Name: {$row['name']}, Tenant: {$row['tenant_id']}\n";
    }
}

$mysqli->close();
?>
