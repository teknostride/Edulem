<?php
/**
 * Classlem - Edulem Veri Çekme Uç Noktası (get_data.php)
 * Edulem veritabanından sınıfları ve öğrencileri dinamik olarak çeker.
 * Öğrencilerin Classlem puanlarını ve avatarlarını harmanlayarak JSON döndürür.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/init_tables.php';

try {
    $pdo = getEdulemPdo();
    initClasslemTables($pdo);

    // 1. DÖNEMLER (SEASONS) VE AKTİF DÖNEM TESPİTİ
    $seasonsStmt = $pdo->query("SELECT id, name, is_active FROM seasons ORDER BY id DESC");
    $seasons = $seasonsStmt->fetchAll();

    $activeSeason = null;
    foreach ($seasons as $s) {
        if (!empty($s['is_active'])) {
            $activeSeason = $s;
            break;
        }
    }
    if (!$activeSeason && !empty($seasons)) {
        $activeSeason = $seasons[0];
    }

    $requestedSeason = isset($_GET['season_id']) ? trim($_GET['season_id']) : null;
    $targetSeasonId = null;
    if ($requestedSeason === 'all') {
        $targetSeasonId = 'all';
    } elseif (!empty($requestedSeason) && is_numeric($requestedSeason)) {
        $targetSeasonId = (int)$requestedSeason;
    } elseif ($activeSeason) {
        $targetSeasonId = (int)$activeSeason['id'];
    }

    // 2. KULLANICI KİMLİK DOĞRULAMA & DERS PROGRAMI FİLTRESİ
    $currentUserId = null;
    if (!empty($_SESSION['classlem_user_id'])) {
        $currentUserId = (int)$_SESSION['classlem_user_id'];
    } elseif (!empty($_GET['teacher_id'])) {
        $currentUserId = (int)$_GET['teacher_id'];
    } elseif (!empty($_POST['teacher_id'])) {
        $currentUserId = (int)$_POST['teacher_id'];
    }

    $currentUser = null;
    $isAdmin = false;
    if ($currentUserId) {
        $uStmt = $pdo->prepare("
            SELECT u.id, u.name, u.tc_no, u.is_superadmin, r.name AS role_name, r.display_name AS role_display
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = :id AND u.is_active = 1
            LIMIT 1
        ");
        $uStmt->execute([':id' => $currentUserId]);
        $currentUser = $uStmt->fetch(PDO::FETCH_ASSOC);
        if ($currentUser) {
            $allClassRoles = [
                'owner', 'Kurum Sahibi',
                'Genel Müdür',
                'Kampüs Müdürü',
                'Müdür',
                'Müdür Yardımcısı',
                'Rehberlik',
                'Öğrenci İşleri'
            ];
            $canViewAllClasses = !empty($currentUser['is_superadmin'])
                || in_array(trim($currentUser['role_name'] ?? ''), $allClassRoles)
                || in_array(trim($currentUser['role_display'] ?? ''), $allClassRoles);

            $adminRoles = ['owner', 'Kurum Sahibi', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'];
            $isAdmin = !empty($currentUser['is_superadmin'])
                       || in_array(trim($currentUser['role_name'] ?? ''), $adminRoles)
                       || in_array(trim($currentUser['role_display'] ?? ''), $adminRoles);
        }
    }

    // Oturum yoksa 401 dön (veya demo parametresi yoksa)
    if (!$currentUser && empty($_GET['demo'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'authenticated' => false,
            'error' => 'ClassLem kullanımı için Edulem hesabınızla giriş yapmalısınız.',
            'code' => 'UNAUTHORIZED'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3. SINIFLARI ÇEK
    $classSql = "SELECT c.id, c.name, c.code, c.grade_level, c.season_id, c.capacity,
                        el.name AS level_name
                 FROM classrooms c
                 LEFT JOIN education_levels el ON c.grade_level = el.id
                 WHERE c.is_active = 1 ";
    $params = [];
    if ($targetSeasonId !== 'all' && $targetSeasonId !== null) {
        $classSql .= " AND c.season_id = :season_id ";
        $params[':season_id'] = $targetSeasonId;
    }

    // Öğretmen için ders programından sınıf sınırlaması
    // İdareciler, kurucu, rehberlik ve öğrenci işleri için kısıtlama yapılmaz, tüm sınıfları görürler!
    $teacherHasNoClasses = false;
    if ($currentUser && !$canViewAllClasses) {
        $schedSql = "
            SELECT DISTINCT classroom_id, assistant_teacher_ids, teacher_id
            FROM schedules
            WHERE (teacher_id = :tid OR (assistant_teacher_ids IS NOT NULL AND assistant_teacher_ids != '' AND assistant_teacher_ids != '[]'))
        ";
        $schedParams = [':tid' => $currentUser['id']];
        if ($targetSeasonId !== 'all' && $targetSeasonId !== null) {
            $schedSql .= " AND season_id = :sched_season ";
            $schedParams[':sched_season'] = $targetSeasonId;
        }
        $schedStmt = $pdo->prepare($schedSql);
        $schedStmt->execute($schedParams);
        $teacherClassMap = [];
        while ($sRow = $schedStmt->fetch(PDO::FETCH_ASSOC)) {
            $cId = (int)$sRow['classroom_id'];
            if ((int)$sRow['teacher_id'] === (int)$currentUser['id']) {
                $teacherClassMap[$cId] = true;
            } else {
                $assts = json_decode($sRow['assistant_teacher_ids'], true);
                if (is_array($assts) && in_array((int)$currentUser['id'], array_map('intval', $assts))) {
                    $teacherClassMap[$cId] = true;
                }
            }
        }
        $allowedClassIds = array_keys($teacherClassMap);

        if (empty($allowedClassIds)) {
            $teacherHasNoClasses = true;
            $classSql .= " AND 1=0 ";
        } else {
            $classSql .= " AND c.id IN (" . implode(',', array_map('intval', $allowedClassIds)) . ") ";
        }
    }

    $classSql .= " ORDER BY c.name ASC";

    $stmt = $pdo->prepare($classSql);
    $stmt->execute($params);
    $rawClasses = $stmt->fetchAll();

    // 3. SINIFLARI KADEME VE ŞUBE SIRASINA GÖRE DOĞAL SIRALA
    // Sıralama Önceliği: İlkokul (1), Ortaokul (2), Lise (3), Anaokulu (4)
    if (!function_exists('getClassCategory')) {
        function getClassCategory($className, $levelName) {
            $clean = mb_strtoupper(trim($className), 'UTF-8');
            $lvl = mb_strtolower(trim($levelName ?: ''), 'UTF-8');

            if (preg_match('/^(9|10|11|12)/u', $clean) || str_contains($lvl, 'lise')) return 'lise';
            if (preg_match('/^[5-8]/u', $clean) || str_contains($lvl, 'ortaokul')) return 'ortaokul';
            if (preg_match('/^[1-4]/u', $clean) || str_contains($lvl, 'ilkokul')) return 'ilkokul';
            if (str_contains($clean, 'ANA') || str_contains($lvl, 'ana')) return 'anaokulu';
            return 'diger';
        }
    }

    if (!function_exists('getClassSortWeight')) {
        function getClassSortWeight($className, $levelName) {
            $cat = getClassCategory($className, $levelName);
            $base = 2000;
            if ($cat === 'ilkokul') $base = 100;
            elseif ($cat === 'ortaokul') $base = 500;
            elseif ($cat === 'lise') $base = 1000;
            elseif ($cat === 'anaokulu') $base = 1500;

            // Sınıf seviyesi numarası (örn 1-A -> 10, 4-A -> 40, 10-A -> 100)
            if (preg_match('/^(\d+)/u', $className, $m)) {
                $base += (int)$m[1] * 10;
            }

            return $base;
        }
    }

    usort($rawClasses, function($a, $b) {
        $wA = getClassSortWeight($a['name'], $a['level_name']);
        $wB = getClassSortWeight($b['name'], $b['level_name']);
        if ($wA !== $wB) return $wA <=> $wB;
        return strnatcasecmp($a['name'], $b['name']);
    });

    // İkon belirleme
    if (!function_exists('getClassIcon')) {
        function getClassIcon($className, $levelName) {
            $clean = mb_strtoupper(trim($className), 'UTF-8');
            $lvl = mb_strtolower(trim($levelName ?: ''), 'UTF-8');

            if (preg_match('/^(9|10|11|12)/u', $clean) || str_contains($lvl, 'lise')) return '🎓';
            if (preg_match('/^[5-8]/u', $clean) || str_contains($lvl, 'ortaokul')) return '🚀';
            if (preg_match('/^[1-4]/u', $clean) || str_contains($lvl, 'ilkokul')) return '🎒';
            if (str_contains($clean, 'ANA') || str_contains($lvl, 'ana')) return '🐣';
            return '🏫';
        }
    }

    $classIds = [];
    $formattedClasses = [];
    $catTitles = [
        'ilkokul' => 'İlkokul',
        'ortaokul' => 'Ortaokul',
        'lise' => 'Lise',
        'anaokulu' => 'Anaokulu',
        'diger' => 'Diğer Sınıflar'
    ];

    foreach ($rawClasses as $c) {
        $cIdStr = (string)$c['id'];
        $classIds[] = $c['id'];
        $cat = getClassCategory($c['name'], $c['level_name']);
        $formattedClasses[] = [
            'id' => $cIdStr,
            'name' => $c['name'],
            'grade' => $c['level_name'] ?: ($c['grade_level'] ? $c['grade_level'] . '. Kademe' : 'Genel'),
            'category' => $cat,
            'categoryTitle' => $catTitles[$cat] ?? 'Sınıflar',
            'icon' => getClassIcon($c['name'], $c['level_name']),
            'seasonId' => $c['season_id'],
            'code' => $c['code'],
            'capacity' => (int)($c['capacity'] ?? 0)
        ];
    }

    // 4. BU SINIFLARDAKİ AKTİF ÖĞRENCİLERİ VE PUANLARINI ÇEK
    $formattedStudents = [];
    if (!empty($classIds)) {
        // SQL IN clause placeholder oluştur
        $placeholders = implode(',', array_fill(0, count($classIds), '?'));
        $studentSql = "SELECT s.id, s.classroom_id, s.name, s.school_no, s.gender,
                              COALESCE(p.points, 0) AS points,
                              p.avatar_seed
                       FROM students s
                       LEFT JOIN classlem_student_points p ON s.id = p.student_id
                       WHERE s.is_active = 1 AND s.classroom_id IN ($placeholders)
                       ORDER BY s.name ASC";

        $sStmt = $pdo->prepare($studentSql);
        $sStmt->execute($classIds);
        $rawStudents = $sStmt->fetchAll();

        foreach ($rawStudents as $s) {
            $formattedStudents[] = [
                'id' => (string)$s['id'],
                'classId' => (string)$s['classroom_id'],
                'name' => $s['name'],
                'schoolNo' => $s['school_no'] ?: '',
                'gender' => $s['gender'] ?: '',
                'points' => (int)$s['points'],
                'avatarSeed' => !empty($s['avatar_seed']) ? $s['avatar_seed'] : ((int)$s['id'] % 1000 + 1)
            ];
        }
    }

    // 5. ÇALIŞMA GRUPLARINI ÇEK
    $groups = [];
    if (!empty($classIds)) {
        $placeholders = implode(',', array_fill(0, count($classIds), '?'));
        $gStmt = $pdo->prepare("SELECT id, classroom_id, name, student_ids FROM classlem_groups WHERE classroom_id IN ($placeholders)");
        $gStmt->execute($classIds);
        while ($g = $gStmt->fetch()) {
            $groups[] = [
                'id' => (string)$g['id'],
                'classId' => (string)$g['classroom_id'],
                'name' => $g['name'],
                'studentIds' => json_decode($g['student_ids'], true) ?: []
            ];
        }
    }

    // 6. DAVRANIŞ VE ETKİNLİK GEÇMİŞİNİ ÇEK (Son 200 kayıt)
    $history = [];
    if (!empty($classIds)) {
        $placeholders = implode(',', array_fill(0, count($classIds), '?'));
        $hStmt = $pdo->prepare("SELECT id, classroom_id, student_ids, student_names, skill_title, skill_icon, points, type, created_at
                                FROM classlem_history
                                WHERE classroom_id IN ($placeholders)
                                ORDER BY created_at DESC LIMIT 200");
        $hStmt->execute($classIds);
        while ($h = $hStmt->fetch()) {
            $history[] = [
                'id' => (string)$h['id'],
                'classId' => (string)$h['classroom_id'],
                'studentIds' => json_decode($h['student_ids'], true) ?: [],
                'studentNames' => $h['student_names'],
                'skillTitle' => $h['skill_title'],
                'skillIcon' => $h['skill_icon'],
                'points' => (int)$h['points'],
                'type' => $h['type'],
                'timestamp' => $h['created_at']
            ];
        }
    }

    // 7. ÖZEL BECERİLER (Varsa veritabanından, yoksa null dönerek varsayılanları kullandır)
    $skills = null;
    $skStmt = $pdo->query("SELECT id, title, points, icon, type FROM classlem_skills ORDER BY sort_order ASC");
    $dbSkills = $skStmt->fetchAll();
    if (!empty($dbSkills)) {
        $skills = array_map(function($sk) {
            return [
                'id' => $sk['id'],
                'title' => $sk['title'],
                'points' => (int)$sk['points'],
                'icon' => $sk['icon'],
                'type' => $sk['type']
            ];
        }, $dbSkills);
    }

    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'currentUser' => $currentUser ? [
            'id' => (int)$currentUser['id'],
            'name' => $currentUser['name'],
            'tc_no' => $currentUser['tc_no'],
            'role' => $currentUser['role_display'] ?: $currentUser['role_name'] ?: 'Öğretmen',
            'role_name' => $currentUser['role_name'],
            'is_admin' => $isAdmin,
            'can_view_all_classes' => !empty($canViewAllClasses),
            'can_view_reports' => !empty($canViewAllClasses),
            'can_reset_points' => !empty($canViewAllClasses)
        ] : null,
        'teacherHasNoClasses' => !empty($teacherHasNoClasses),
        'activeSeason' => $activeSeason,
        'selectedSeasonId' => $targetSeasonId,
        'seasons' => $seasons,
        'classes' => $formattedClasses,
        'students' => $formattedStudents,
        'groups' => $groups,
        'history' => $history,
        'skills' => $skills,
        'totalClasses' => count($formattedClasses),
        'totalStudents' => count($formattedStudents)
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
