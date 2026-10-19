<?php
/**
 * Classlem - İşlem Kaydetme Uç Noktası (save_action.php)
 * Puan verme, avatar değiştirme, grup kaydetme ve geçmiş işlemlerini veritabanına yazar.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/init_tables.php';

try {
    $pdo = getEdulemPdo();
    initClasslemTables($pdo);

    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $action = isset($input['action']) ? trim($input['action']) : '';

    if ($action === 'award') {
        $classId = isset($input['class_id']) ? (int)$input['class_id'] : 0;
        $studentIds = isset($input['student_ids']) && is_array($input['student_ids']) ? $input['student_ids'] : [];
        $studentNames = isset($input['student_names']) ? trim($input['student_names']) : '';
        $skillTitle = isset($input['skill_title']) ? trim($input['skill_title']) : 'Beceri';
        $skillIcon = isset($input['skill_icon']) ? trim($input['skill_icon']) : '⭐';
        $points = isset($input['points']) ? (int)$input['points'] : 1;
        $type = isset($input['type']) ? trim($input['type']) : 'positive';
        $historyId = isset($input['history_id']) ? trim($input['history_id']) : ('hist_' . time() . '_' . substr(md5(uniqid()), 0, 4));

        if (empty($studentIds)) {
            throw new Exception("Öğrenci listesi boş.");
        }

        $pdo->beginTransaction();

        $pointStmt = $pdo->prepare("
            INSERT INTO classlem_student_points (student_id, classroom_id, points, updated_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE points = points + ?, classroom_id = VALUES(classroom_id), updated_at = NOW()
        ");

        foreach ($studentIds as $sId) {
            $pointStmt->execute([(int)$sId, $classId, $points, $points]);
        }

        $histStmt = $pdo->prepare("
            INSERT INTO classlem_history (id, classroom_id, student_ids, student_names, skill_title, skill_icon, points, type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $histStmt->execute([
            $historyId,
            $classId,
            json_encode(array_map('strval', $studentIds)),
            $studentNames,
            $skillTitle,
            $skillIcon,
            $points,
            $type
        ]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Puanlar başarıyla kaydedildi.',
            'historyId' => $historyId
        ]);
        exit;
    }

    if ($action === 'update_avatar') {
        $studentId = isset($input['student_id']) ? (int)$input['student_id'] : 0;
        $avatarSeed = isset($input['avatar_seed']) ? (string)$input['avatar_seed'] : '';
        $classId = isset($input['class_id']) ? (int)$input['class_id'] : null;

        if (!$studentId) {
            throw new Exception("Geçersiz öğrenci ID.");
        }

        $stmt = $pdo->prepare("
            INSERT INTO classlem_student_points (student_id, classroom_id, points, avatar_seed, updated_at)
            VALUES (?, ?, 0, ?, NOW())
            ON DUPLICATE KEY UPDATE avatar_seed = VALUES(avatar_seed), updated_at = NOW()
        ");
        $stmt->execute([$studentId, $classId, $avatarSeed]);

        echo json_encode(['success' => true, 'message' => 'Avatar güncellendi.']);
        exit;
    }

    if ($action === 'save_group') {
        $groupId = isset($input['id']) ? trim($input['id']) : ('grp_' . time());
        $classId = isset($input['class_id']) ? (int)$input['class_id'] : 0;
        $name = isset($input['name']) ? trim($input['name']) : 'Grup';
        $studentIds = isset($input['student_ids']) && is_array($input['student_ids']) ? $input['student_ids'] : [];

        $stmt = $pdo->prepare("
            INSERT INTO classlem_groups (id, classroom_id, name, student_ids, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE name = VALUES(name), student_ids = VALUES(student_ids), updated_at = NOW()
        ");
        $stmt->execute([$groupId, $classId, $name, json_encode(array_map('strval', $studentIds))]);

        echo json_encode(['success' => true, 'groupId' => $groupId]);
        exit;
    }

    if ($action === 'delete_group') {
        $groupId = isset($input['id']) ? trim($input['id']) : '';
        if ($groupId) {
            $stmt = $pdo->prepare("DELETE FROM classlem_groups WHERE id = ?");
            $stmt->execute([$groupId]);
        }
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'clear_history') {
        $classId = isset($input['class_id']) ? (int)$input['class_id'] : 0;
        if ($classId) {
            $stmt = $pdo->prepare("DELETE FROM classlem_history WHERE classroom_id = ?");
            $stmt->execute([$classId]);
        }
        echo json_encode(['success' => true, 'message' => 'Geçmiş temizlendi.']);
        exit;
    }

    if ($action === 'reset_points') {
        $classId = isset($input['class_id']) ? (int)$input['class_id'] : 0;
        if ($classId) {
            $stmt = $pdo->prepare("UPDATE classlem_student_points SET points = 0 WHERE classroom_id = ?");
            $stmt->execute([$classId]);
        }
        echo json_encode(['success' => true, 'message' => 'Puanlar sıfırlandı.']);
        exit;
    }

    throw new Exception("Bilinmeyen işlem: " . htmlspecialchars($action));

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
