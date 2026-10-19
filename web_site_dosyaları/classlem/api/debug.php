<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$result = [
    'php_version'    => PHP_VERSION,
    'pdo_available'  => extension_loaded('pdo'),
    'pdo_mysql'      => extension_loaded('pdo_mysql'),
    'session_status' => session_status(),
    'server_software'=> $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'script_dir'     => __DIR__,
    'db_test'        => null,
    'db_error'       => null,
];

require_once __DIR__ . '/db.php';
try {
    $pdo = getEdulemPdo();
    $stmt = $pdo->query('SELECT COUNT(*) as cnt FROM users LIMIT 1');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['db_test'] = 'OK - users count: ' . ($row['cnt'] ?? '?');
} catch (Exception $e) {
    $result['db_error'] = $e->getMessage();
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

