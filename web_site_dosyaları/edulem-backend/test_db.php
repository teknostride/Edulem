<?php
try {
    $pdo = new PDO('mysql:host=api.akirfan.edulem.com;port=3306;dbname=akirfan_;charset=utf8mb4', 'Professor', 'j^G4O@S7lyxqlrl7', [PDO::ATTR_TIMEOUT => 5]);

    $userId = 1;
    $plainText = bin2hex(random_bytes(20));
    $hashed = hash('sha256', $plainText);

    $stmt = $pdo->prepare("INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at) VALUES ('App\\\\Models\\\\User', ?, 'test-check-hw', ?, '[\"*\"]', NOW(), NOW())");
    $stmt->execute([$userId, $hashed]);
    $tokenId = $pdo->lastInsertId();

    $fullToken = $tokenId . '|' . $plainText;
    echo "TOKEN=" . $fullToken . PHP_EOL;

} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
