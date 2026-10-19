<?php
/**
 * KeyLem - Sınıf Şampiyonlar Podyumu API'si (class_podium.php)
 * Seçilen sınıfın (örn: 1-A veya 2-A) en yüksek puanlı 1., 2., 3. şampiyonlarını ve sıralamasını çeker.
 * Akıllı tahta kilitliyken podyumun canlı görünmesini sağlar.
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

    $classroomId = isset($_GET['classroom_id']) ? trim($_GET['classroom_id']) : '';
    $classroomName = isset($_GET['classroom_name']) ? trim($_GET['classroom_name']) : '';

    // Sınıfı bul
    $cls = null;
    if (!empty($classroomId) && is_numeric($classroomId)) {
        $stmt = $pdo->prepare("SELECT id, name, grade_level FROM classrooms WHERE id = ? LIMIT 1");
        $stmt->execute([(int)$classroomId]);
        $cls = $stmt->fetch();
    }

    if (!$cls && !empty($classroomName)) {
        $stmt = $pdo->prepare("SELECT id, name, grade_level FROM classrooms WHERE name = ? OR name LIKE ? LIMIT 1");
        $stmt->execute([$classroomName, '%' . $classroomName . '%']);
        $cls = $stmt->fetch();
    }

    if (!$cls) {
        // İlk aktif sınıfı al
        $stmt = $pdo->query("SELECT id, name, grade_level FROM classrooms WHERE is_active = 1 ORDER BY name ASC LIMIT 1");
        $cls = $stmt->fetch();
    }

    if (!$cls) {
        jsonResponse([
            'success' => false,
            'message' => 'Sınıf bulunamadı.',
            'students' => []
        ]);
    }

    $cId = (int)$cls['id'];

    // Sınıftaki öğrencileri ve ClassLem puanlarını çek
    $sql = "
        SELECT s.id, s.classroom_id, s.name, s.school_no, s.gender,
               COALESCE(p.points, 0) AS points,
               p.avatar_seed
        FROM students s
        LEFT JOIN classlem_student_points p ON s.id = p.student_id
        WHERE s.is_active = 1 AND s.classroom_id = ?
        ORDER BY points DESC, s.name ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$cId]);
    $rawStudents = $stmt->fetchAll();

    $students = [];
    foreach ($rawStudents as $index => $s) {
        $students[] = [
            'rank' => $index + 1,
            'id' => (string)$s['id'],
            'name' => $s['name'],
            'school_no' => $s['school_no'] ?: '',
            'points' => (int)$s['points'],
            'avatar_seed' => !empty($s['avatar_seed']) ? $s['avatar_seed'] : ((int)$s['id'] % 1000 + 1)
        ];
    }

    jsonResponse([
        'success' => true,
        'classroom' => [
            'id' => (string)$cls['id'],
            'name' => $cls['name'],
            'grade_level' => $cls['grade_level'],
        ],
        'total_students' => count($students),
        'podium' => [
            'first' => $students[0] ?? null,
            'second' => $students[1] ?? null,
            'third' => $students[2] ?? null,
        ],
        'leaderboard' => array_slice($students, 3, 10), // 4'ten 13'e kadar olanlar
        'all_students' => $students,
    ]);

} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
