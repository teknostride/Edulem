<?php

$host = '127.0.0.1';
$port = 3306;
$user = 'root';
$pass = '';
$dbName = 'premium_edu_test';

$dsn = "mysql:host={$host};port={$port};charset=utf8mb4";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "OK\n";
} catch (Throwable $e) {
    fwrite(STDERR, "ERR: " . $e->getMessage() . "\n");
    exit(1);
}
