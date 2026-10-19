<?php
/**
 * Classlem - Edulem Veritabanı Bağlantı Köprüsü (db.php)
 * Edulem MySQL veritabanına otomatik ve güvenli PDO bağlantısı sağlar.
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle !== '' && mb_strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return $needle === '' || substr($haystack, -strlen($needle)) === $needle;
    }
}

/**
 * .env dosyasını anahtar=değer olarak ayrıştırır.
 */
function parseEnvFile($path) {
    $cfg = [];
    if (file_exists($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '#')) continue;
            if (str_contains($line, '=')) {
                list($key, $val) = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val, " \t\n\r\0\x0B\"'");
                if ($key === 'DB_HOST') $cfg['host'] = $val;
                if ($key === 'DB_PORT') $cfg['port'] = $val;
                if ($key === 'DB_DATABASE') $cfg['database'] = $val;
                if ($key === 'DB_USERNAME') $cfg['username'] = $val;
                if ($key === 'DB_PASSWORD') $cfg['password'] = $val;
            }
        }
    }
    return $cfg;
}

/**
 * Edulem PDO Veritabanı bağlantısı sağlar.
 */
function getEdulemPdo() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $candidates = [
        // 1. Canlı Edulem (akirfan_) - api.akirfan.edulem.com
        [
            'host' => 'api.akirfan.edulem.com',
            'port' => '3306',
            'database' => 'akirfan_',
            'username' => 'Professor',
            'password' => 'j^G4O@S7lyxqlrl7'
        ],
        // 2. Canlı sunucu / yerel host akirfan_
        [
            'host' => '127.0.0.1',
            'port' => '3306',
            'database' => 'akirfan_',
            'username' => 'Professor',
            'password' => 'j^G4O@S7lyxqlrl7'
        ]
    ];

    // 3. .env_okd yapılandırması
    $envOkdPath = __DIR__ . '/../../edulem-backend/.env_okd';
    $envOkd = parseEnvFile($envOkdPath);
    if (!empty($envOkd['database'])) {
        $candidates[] = [
            'host' => (!empty($envOkd['host']) && $envOkd['host'] !== 'localhost' && $envOkd['host'] !== '127.0.0.1') ? $envOkd['host'] : 'api.akirfan.edulem.com',
            'port' => isset($envOkd['port']) ? $envOkd['port'] : '3306',
            'database' => $envOkd['database'],
            'username' => isset($envOkd['username']) ? $envOkd['username'] : 'Professor',
            'password' => isset($envOkd['password']) ? $envOkd['password'] : 'j^G4O@S7lyxqlrl7'
        ];
    }

    // 4. Yerel .env (premium_edu)
    $localEnvPath = __DIR__ . '/../../edulem-backend/.env';
    $localEnv = parseEnvFile($localEnvPath);
    if (!empty($localEnv['database'])) {
        $candidates[] = [
            'host' => isset($localEnv['host']) ? $localEnv['host'] : '127.0.0.1',
            'port' => isset($localEnv['port']) ? $localEnv['port'] : '3306',
            'database' => $localEnv['database'],
            'username' => isset($localEnv['username']) ? $localEnv['username'] : 'root',
            'password' => isset($localEnv['password']) ? $localEnv['password'] : ''
        ];
    }

    $lastErr = null;
    foreach ($candidates as $cfg) {
        try {
            $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['database']};charset=utf8mb4";
            $conn = new PDO($dsn, $cfg['username'], $cfg['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 4,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ]);
            $pdo = $conn;
            return $pdo;
        } catch (Exception $e) {
            $lastErr = $e;
        }
    }

    throw $lastErr ?: new Exception("Edulem veritabanına bağlanılamadı.");
}
