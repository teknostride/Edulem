<?php
/**
 * KeyLem - Kod Doğrulama ve Kilit Açma API'si (verify.php)
 * Girilen kodun Master PIN veya geçerli TOTP olduğunu doğrular ve loglar.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/generate_key.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $enteredCode = trim($input['code'] ?? '');
    $classroomId = trim($input['classroom_id'] ?? '');
    $classroomName = trim($input['classroom_name'] ?? '');

    if (empty($enteredCode)) {
        jsonResponse(['success' => false, 'message' => 'Lütfen 6 haneli kodu giriniz.'], 400);
    }

    $pdo = getKeylemPdo();

    // 1. Master PIN kontrolü
    $masterPin = '849201';
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM keylem_settings WHERE setting_key = 'smartboard_master_pin' LIMIT 1");
        $stmt->execute();
        $dbMaster = $stmt->fetchColumn();
        if (!empty($dbMaster)) $masterPin = $dbMaster;
    } catch (Exception $e) {}

    $isMaster = ($enteredCode === $masterPin);
    $isTotpValid = false;

    // 2. TOTP kontrolü (±1 adım tölerans - saat kaymalarını tolere eder)
    if (!$isMaster) {
        $secretKey = getSmartboardSecretKey($pdo);

        for ($offset = -1; $offset <= 1; $offset++) {
            if ($enteredCode === getTOTPCode($secretKey, $offset)) {
                $isTotpValid = true;
                break;
            }
        }
    }

    if (!$isMaster && !$isTotpValid) {
        jsonResponse([
            'success' => false,
            'message' => 'Geçersiz veya süresi dolmuş anahtar kod!'
        ], 401);
    }

    // Başarılı ise log kaydı ekle
    $unlockType = $isMaster ? 'master_pin' : 'totp_key';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

    try {
        $logStmt = $pdo->prepare("
            INSERT INTO keylem_logs (classroom_id, classroom_name, unlock_type, ip_address)
            VALUES (?, ?, ?, ?)
        ");
        $logStmt->execute([$classroomId, $classroomName, $unlockType, $ip]);
    } catch (_) {}

    // Ders süresi ayarını çek
    $durStmt = $pdo->prepare("SELECT setting_value FROM keylem_settings WHERE setting_key = 'lesson_duration_minutes' LIMIT 1");
    $durStmt->execute();
    $duration = (int)($durStmt->fetchColumn() ?: 40);

    jsonResponse([
        'success' => true,
        'is_master' => $isMaster,
        'duration_minutes' => $duration,
        'message' => $isMaster ? 'Master Kod ile tahta kilidi açıldı.' : 'Öğretmen anahtarı doğrulandı. Kilit açıldı!',
        'unlocked_at' => date('Y-m-d H:i:s'),
    ]);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
