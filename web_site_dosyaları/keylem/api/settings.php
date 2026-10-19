<?php
/**
 * KeyLem - Kurum Ayarları ve Master Kod API'si (settings.php)
 * Master acil durum kodu, TOTP gizli anahtarı ve ders süresi yönetimini sağlar.
 */

require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getKeylemPdo();

    // Gerekli tabloları otomatik oluştur
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `keylem_settings` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `setting_key` VARCHAR(100) NOT NULL UNIQUE,
            `setting_value` TEXT NULL,
            `description` VARCHAR(255) NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `keylem_logs` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `classroom_id` VARCHAR(50) NULL,
            `classroom_name` VARCHAR(100) NULL,
            `unlock_type` VARCHAR(50) NOT NULL, -- 'totp_key', 'master_pin', 'emergency'
            `teacher_name` VARCHAR(100) NULL,
            `ip_address` VARCHAR(45) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Varsayılan ayarları yükle veya hazırla
    function getSetting($pdo, $key, $default = '') {
        $stmt = $pdo->prepare("SELECT setting_value FROM keylem_settings WHERE setting_key = ? LIMIT 1");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        return ($val !== false && $val !== null) ? $val : $default;
    }

    function setSetting($pdo, $key, $value, $description = '') {
        $stmt = $pdo->prepare("
            INSERT INTO keylem_settings (setting_key, setting_value, description)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)
        ");
        return $stmt->execute([$key, $value, $description]);
    }

    // İlk kurulumda yoksa varsayılanları tanımla
    $masterPin = getSetting($pdo, 'smartboard_master_pin');
    if (empty($masterPin)) {
        $masterPin = '849201'; // Varsayılan güçlü 6 haneli Master PIN
        setSetting($pdo, 'smartboard_master_pin', $masterPin, 'Kurum Acil Durum Master Açılış Kodu');
    }

    $secretKey = getSetting($pdo, 'smartboard_secret_key');
    if (empty($secretKey)) {
        // Standart Base32 16-karakterlik TOTP gizli anahtarı
        $secretKey = 'JBSWY3DPEHPK3PXP';
        setSetting($pdo, 'smartboard_secret_key', $secretKey, 'Dinamik Kod TOTP Gizli Anahtarı');
    }

    $lessonDuration = (int)getSetting($pdo, 'lesson_duration_minutes', '40');

    // POST: Ayarları Güncelleme
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        if (isset($input['master_pin'])) {
            $newPin = trim($input['master_pin']);
            if (strlen($newPin) >= 4 && strlen($newPin) <= 10) {
                setSetting($pdo, 'smartboard_master_pin', $newPin, 'Kurum Acil Durum Master Açılış Kodu');
                $masterPin = $newPin;
            } else {
                jsonResponse(['success' => false, 'message' => 'Master PIN en az 4, en fazla 10 haneli olmalıdır.'], 400);
            }
        }

        if (isset($input['secret_key']) && !empty($input['secret_key'])) {
            $newSecret = strtoupper(preg_replace('/[^A-Z2-7]/', '', trim($input['secret_key'])));
            if (strlen($newSecret) >= 16) {
                setSetting($pdo, 'smartboard_secret_key', $newSecret, 'Dinamik Kod TOTP Gizli Anahtarı');
                $secretKey = $newSecret;
            }
        }

        if (isset($input['lesson_duration_minutes'])) {
            $newDuration = max(5, min(120, (int)$input['lesson_duration_minutes']));
            setSetting($pdo, 'lesson_duration_minutes', (string)$newDuration, 'Ders Kilit Süresi (Dakika)');
            $lessonDuration = $newDuration;
        }

        jsonResponse([
            'success' => true,
            'message' => 'KeyLem kurum ayarları başarıyla güncellendi.',
            'settings' => [
                'master_pin' => $masterPin,
                'secret_key' => $secretKey,
                'lesson_duration_minutes' => $lessonDuration,
            ]
        ]);
    }

    // GET: Ayarları Döndür (Kurulum ve admin için)
    jsonResponse([
        'success' => true,
        'settings' => [
            'master_pin' => $masterPin,
            'secret_key' => $secretKey,
            'lesson_duration_minutes' => $lessonDuration,
        ]
    ]);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
