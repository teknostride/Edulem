<?php
/**
 * KeyLem - Dinamik Öğretmen Anahtar Kodu Üreteci (generate_key.php)
 * EduLem mobil uygulaması ve öğretmen paneli için o an geçerli 6 haneli kodu üretir.
 */

require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Base32 Decode
 */
function base32Decode($b32) {
    $lut = [
        'A' => 0,  'B' => 1,  'C' => 2,  'D' => 3,
        'E' => 4,  'F' => 5,  'G' => 6,  'H' => 7,
        'I' => 8,  'J' => 9,  'K' => 10, 'L' => 11,
        'M' => 12, 'N' => 13, 'O' => 14, 'P' => 15,
        'Q' => 16, 'R' => 17, 'S' => 18, 'T' => 19,
        'U' => 20, 'V' => 21, 'W' => 22, 'X' => 23,
        'Y' => 24, 'Z' => 25, '2' => 26, '3' => 27,
        '4' => 28, '5' => 29, '6' => 30, '7' => 31
    ];

    $b32 = strtoupper(rtrim($b32, "=\x00\r\n\t "));
    $buffer = 0;
    $bitsLeft = 0;
    $output = '';

    for ($i = 0; $i < strlen($b32); $i++) {
        $c = $b32[$i];
        if (!isset($lut[$c])) continue;
        $buffer = ($buffer << 5) | $lut[$c];
        $bitsLeft += 5;
        if ($bitsLeft >= 8) {
            $bitsLeft -= 8;
            $output .= chr(($buffer >> $bitsLeft) & 0xFF);
        }
    }
    return $output;
}

/**
 * RFC 6238 Standart TOTP Kodu Üretici (30 saniyelik periyot, 6 hane)
 */
function getTOTPCode($secretKey, $timeStepOffset = 0) {
    $timeStep = 30;
    $timeSlice = floor(time() / $timeStep) + $timeStepOffset;
    $binarySecret = base32Decode($secretKey);

    // 64-bit integer pack (Big-endian)
    $data = pack('N*', 0) . pack('N*', $timeSlice);
    $hash = hash_hmac('sha1', $data, $binarySecret, true);

    $offset = ord(substr($hash, -1)) & 0x0F;
    $part = substr($hash, $offset, 4);
    $value = unpack('N', $part);
    $value = $value[1] & 0x7FFFFFFF;

    $code = str_pad($value % 1000000, 6, '0', STR_PAD_LEFT);
    return $code;
}

/**
 * Get Smartboard Secret Key with fallback
 */
function getSmartboardSecretKey($pdo = null) {
    $defaultKey = 'JBSWY3DPEHPK3PXP';
    if (!$pdo) {
        try {
            $pdo = getKeylemPdo();
        } catch (Exception $e) {
            return $defaultKey;
        }
    }
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM keylem_settings WHERE setting_key = 'smartboard_secret_key' LIMIT 1");
        $stmt->execute();
        $dbSecret = $stmt->fetchColumn();
        return !empty($dbSecret) ? $dbSecret : $defaultKey;
    } catch (Exception $e) {
        return $defaultKey;
    }
}

// Yalnızca doğrudan çağrıldığında yanıt üret
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'generate_key.php' || basename($_SERVER['PHP_SELF'] ?? '') === 'generate_key.php') {
    try {
        $pdo = null;
        try {
            $pdo = getKeylemPdo();
        } catch (Exception $e) {}

        $secretKey = getSmartboardSecretKey($pdo);
        $currentTime = time();
        $currentCode = getTOTPCode($secretKey, 0);
        $secondsRemaining = 30 - ($currentTime % 30);

        jsonResponse([
            'success' => true,
            'key' => $currentCode,
            'seconds_remaining' => $secondsRemaining,
            'interval' => 30,
            'server_time' => date('Y-m-d H:i:s', $currentTime),
        ]);
    } catch (Exception $e) {
        // Her koşulda offline matematiksel TOTP ile devam et
        $currentTime = time();
        $currentCode = getTOTPCode('JBSWY3DPEHPK3PXP', 0);
        $secondsRemaining = 30 - ($currentTime % 30);
        jsonResponse([
            'success' => true,
            'key' => $currentCode,
            'seconds_remaining' => $secondsRemaining,
            'interval' => 30,
            'server_time' => date('Y-m-d H:i:s', $currentTime),
        ]);
    }
}

