<?php
/**
 * KeyLem - Sınıf Listesi API'si (classrooms.php)
 * Akıllı tahtanın ilk kurulumunda şube seçimi için sınıfları listeler.
 */

require_once __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getKeylemPdo();

    // classrooms tablosunu sorgula
    $stmt = $pdo->query("
        SELECT id, name, grade_level, section 
        FROM classrooms 
        WHERE is_active = 1 OR is_active IS NULL 
        ORDER BY grade_level ASC, name ASC
    ");
    $classrooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Eğer veri boşsa veya farklı sütun isimleri varsa fallback
    if (empty($classrooms)) {
        $stmt2 = $pdo->query("SELECT id, name FROM classrooms ORDER BY name ASC LIMIT 50");
        $classrooms = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    }

    jsonResponse([
        'success' => true,
        'count' => count($classrooms),
        'classrooms' => $classrooms
    ]);

} catch (Exception $e) {
    // Fallback: Sık kullanılan okul sınıfları
    jsonResponse([
        'success' => true,
        'is_fallback' => true,
        'classrooms' => [
            ['id' => '1A', 'name' => '1-A'],
            ['id' => '1B', 'name' => '1-B'],
            ['id' => '2A', 'name' => '2-A'],
            ['id' => '2B', 'name' => '2-B'],
            ['id' => '3A', 'name' => '3-A'],
            ['id' => '3B', 'name' => '3-B'],
            ['id' => '4A', 'name' => '4-A'],
            ['id' => '4B', 'name' => '4-B'],
            ['id' => '5A', 'name' => '5-A'],
            ['id' => '6A', 'name' => '6-A'],
            ['id' => '7A', 'name' => '7-A'],
            ['id' => '8A', 'name' => '8-A'],
        ]
    ]);
}
