<?php
/**
 * Classlem - İdare & Rehberlik Raporlama ve Puan Sıfırlama API'si (reports.php)
 * Kurucu, İdareciler, Rehber Öğretmenler ve Öğrenci İşleri için detaylı istatistikler,
 * eksi puan alan öğrencilerin analizi, sınıf kıyaslamaları ve aylık puan sıfırlama sağlar.
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

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/init_tables.php';

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true) ?: [];
$input = array_merge($_GET, $_POST, $jsonInput);

$action = isset($input['action']) ? trim($input['action']) : 'get_reports';

try {
    $pdo = getEdulemPdo();
    initClasslemTables($pdo);

    // 1. KULLANICI KİMLİK DOĞRULAMA
    $userId = null;
    if (!empty($_SESSION['classlem_user_id'])) {
        $userId = (int)$_SESSION['classlem_user_id'];
    } elseif (!empty($input['user_id'])) {
        $userId = (int)$input['user_id'];
    }

    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Bu rapora erişmek için oturum açmanız gerekmektedir.',
            'code' => 'UNAUTHORIZED'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $uStmt = $pdo->prepare("
        SELECT u.id, u.name, u.tc_no, u.is_superadmin, r.name AS role_name, r.display_name AS role_display
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = :id AND u.is_active = 1
        LIMIT 1
    ");
    $uStmt->execute([':id' => $userId]);
    $user = $uStmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Kullanıcı bulunamadı veya oturum geçersiz.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Yetki kontrolü (İdareciler, kurucu, rehberlik, öğrenci işleri)
    $authorizedRoles = [
        'owner', 'Kurum Sahibi',
        'Genel Müdür',
        'Kampüs Müdürü',
        'Müdür',
        'Müdür Yardımcısı',
        'Rehberlik',
        'Öğrenci İşleri'
    ];

    $hasPermission = !empty($user['is_superadmin'])
        || in_array(trim($user['role_name'] ?? ''), $authorizedRoles)
        || in_array(trim($user['role_display'] ?? ''), $authorizedRoles);

    if (!$hasPermission) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Bu raporlama alanına erişim yetkiniz bulunmamaktadır. (Yalnızca İdare, Kurucu, Rehberlik ve Öğrenci İşleri erişebilir)',
            'code' => 'FORBIDDEN'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // ACTION 1: GET REPORTS (İSTATİSTİKLER VE RAPOR)
    // ==========================================
    if ($action === 'get_reports') {
        // Aktif Dönem Tespiti
        $seasonsStmt = $pdo->query("SELECT id, name, is_active FROM seasons ORDER BY id DESC");
        $seasons = $seasonsStmt->fetchAll(PDO::FETCH_ASSOC);
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

        $seasonFilter = isset($input['season_id']) ? trim($input['season_id']) : ($activeSeason ? (string)$activeSeason['id'] : 'all');
        $gradeFilter = isset($input['grade_filter']) ? trim($input['grade_filter']) : 'all';
        $classFilter = isset($input['classroom_id']) && $input['classroom_id'] !== 'all' ? (int)$input['classroom_id'] : null;

        // 1. Sınıfları çek
        $classSql = "
            SELECT c.id, c.name, c.season_id, c.grade_level, el.name as level_name
            FROM classrooms c
            LEFT JOIN education_levels el ON c.grade_level = el.id
            WHERE c.is_active = 1
        ";
        $cParams = [];
        if ($seasonFilter !== 'all' && is_numeric($seasonFilter)) {
            $classSql .= " AND c.season_id = :season_id ";
            $cParams[':season_id'] = (int)$seasonFilter;
        }
        if ($classFilter) {
            $classSql .= " AND c.id = :class_id ";
            $cParams[':class_id'] = $classFilter;
        }
        $classSql .= " ORDER BY c.name ASC ";

        $cStmt = $pdo->prepare($classSql);
        $cStmt->execute($cParams);
        $rawClasses = $cStmt->fetchAll(PDO::FETCH_ASSOC);

        // Kademe sınıflama fonksiyonu
        function getKademeKey($className, $levelName) {
            $clean = mb_strtoupper(trim($className), 'UTF-8');
            $lvl = mb_strtolower(trim($levelName ?: ''), 'UTF-8');
            if (preg_match('/^(9|10|11|12)/u', $clean) || str_contains($lvl, 'lise')) return 'lise';
            if (preg_match('/^[5-8]/u', $clean) || str_contains($lvl, 'ortaokul')) return 'ortaokul';
            if (preg_match('/^[1-4]/u', $clean) || str_contains($lvl, 'ilkokul')) return 'ilkokul';
            if (str_contains($clean, 'ANA') || str_contains($lvl, 'ana')) return 'anaokulu';
            return 'diger';
        }

        // Kademe filtreleme (eğer 'all' değilse)
        if ($gradeFilter !== 'all') {
            $rawClasses = array_filter($rawClasses, function($c) use ($gradeFilter) {
                return getKademeKey($c['name'], $c['level_name']) === $gradeFilter;
            });
        }

        $classMap = [];
        $targetClassIds = [];
        foreach ($rawClasses as $c) {
            $cId = (int)$c['id'];
            $targetClassIds[] = $cId;
            $classMap[$cId] = [
                'id' => $cId,
                'name' => $c['name'],
                'grade' => $c['level_name'] ?: ($c['grade_level'] ? $c['grade_level'] . '. Kademe' : 'Genel'),
                'kademe' => getKademeKey($c['name'], $c['level_name']),
                'student_count' => 0,
                'total_points' => 0,
                'avg_points' => 0.0,
                'positive_points' => 0,
                'negative_points' => 0
            ];
        }

        if (empty($targetClassIds)) {
            echo json_encode([
                'success' => true,
                'summary' => [
                    'total_students' => 0,
                    'total_points' => 0,
                    'positive_points' => 0,
                    'negative_points' => 0,
                    'support_needed_count' => 0,
                    'avg_points_per_student' => 0.0
                ],
                'top_students' => [],
                'needs_support_students' => [],
                'classes_ranking' => [],
                'skills_breakdown' => ['positive' => [], 'needs_work' => []],
                'seasons' => $seasons,
                'active_season_id' => $seasonFilter,
                'classes_filter_list' => []
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $placeholders = implode(',', array_fill(0, count($targetClassIds), '?'));

        // 2. Öğrencileri ve Puanlarını Çek
        $stdSql = "
            SELECT s.id, s.name, s.school_no, s.gender, s.classroom_id,
                   COALESCE(p.points, 0) as points, p.avatar_seed
            FROM students s
            LEFT JOIN classlem_student_points p ON s.id = p.student_id
            WHERE s.is_active = 1 AND s.classroom_id IN ($placeholders)
            ORDER BY s.name ASC
        ";
        $stdStmt = $pdo->prepare($stdSql);
        $stdStmt->execute($targetClassIds);
        $students = $stdStmt->fetchAll(PDO::FETCH_ASSOC);

        $studentsById = [];
        $totalStudents = count($students);
        $totalNetPoints = 0;

        foreach ($students as &$s) {
            $sId = (int)$s['id'];
            $cId = (int)$s['classroom_id'];
            $pts = (int)$s['points'];
            $totalNetPoints += $pts;

            $s['points'] = $pts;
            $s['class_name'] = $classMap[$cId]['name'] ?? 'Bilinmeyen Sınıf';
            $s['kademe'] = $classMap[$cId]['kademe'] ?? 'diger';
            $s['negative_event_count'] = 0;
            $s['negative_skills'] = []; // Beceri adı => adet

            if (isset($classMap[$cId])) {
                $classMap[$cId]['student_count']++;
                $classMap[$cId]['total_points'] += $pts;
            }

            $studentsById[$sId] = &$s;
        }
        unset($s);

        // 3. Etkinlik Geçmişini Analiz Et (Son 500 kayıt)
        $histSql = "
            SELECT classroom_id, student_ids, student_names, skill_title, skill_icon, points, type, created_at
            FROM classlem_history
            WHERE classroom_id IN ($placeholders)
            ORDER BY created_at DESC
            LIMIT 500
        ";
        $histStmt = $pdo->prepare($histSql);
        $histStmt->execute($targetClassIds);
        $historyRows = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        $posPointsTotal = 0;
        $negPointsTotal = 0;
        $skillsCount = ['positive' => [], 'needs_work' => []];

        foreach ($historyRows as $h) {
            $hPoints = (int)$h['points'];
            $hType = $h['type'] === 'needs-work' ? 'needs_work' : 'positive';
            $skillTitle = $h['skill_title'] ?: ($hType === 'positive' ? 'Örnek Davranış' : 'Geliştirilmeli');
            $skillIcon = $h['skill_icon'] ?: ($hType === 'positive' ? '⭐' : '⚠️');

            if ($hType === 'positive') {
                $posPointsTotal += abs($hPoints);
            } else {
                $negPointsTotal += abs($hPoints);
            }

            // Beceri sayaçları
            if (!isset($skillsCount[$hType][$skillTitle])) {
                $skillsCount[$hType][$skillTitle] = [
                    'title' => $skillTitle,
                    'icon' => $skillIcon,
                    'count' => 0,
                    'total_points' => 0
                ];
            }
            $skillsCount[$hType][$skillTitle]['count']++;
            $skillsCount[$hType][$skillTitle]['total_points'] += $hPoints;

            // Öğrenci bazlı negatif geçmiş analizi
            if ($hType === 'needs_work') {
                $sIds = json_decode($h['student_ids'], true);
                if (is_array($sIds)) {
                    foreach ($sIds as $stId) {
                        $stId = (int)$stId;
                        if (isset($studentsById[$stId])) {
                            $studentsById[$stId]['negative_event_count']++;
                            if (!isset($studentsById[$stId]['negative_skills'][$skillTitle])) {
                                $studentsById[$stId]['negative_skills'][$skillTitle] = [
                                    'title' => $skillTitle,
                                    'icon' => $skillIcon,
                                    'count' => 0
                                ];
                            }
                            $studentsById[$stId]['negative_skills'][$skillTitle]['count']++;
                        }
                    }
                }
            }
        }

        // Becerileri sıklığına göre sırala
        uasort($skillsCount['positive'], function($a, $b) { return $b['count'] <=> $a['count']; });
        uasort($skillsCount['needs_work'], function($a, $b) { return $b['count'] <=> $a['count']; });

        // 4. Yıldız Öğrenciler (Top 25)
        $topStudents = $students;
        usort($topStudents, function($a, $b) {
            if ($b['points'] !== $a['points']) return $b['points'] <=> $a['points'];
            return strnatcasecmp($a['name'], $b['name']);
        });
        $topStudents = array_slice($topStudents, 0, 25);

        // 5. Rehberlik & Destek Bekleyen Öğrenciler (Eksi puanlılar veya en çok eksi davranış alanlar)
        $needsSupportList = [];
        foreach ($students as $st) {
            if ($st['points'] < 0 || $st['negative_event_count'] > 0) {
                // Beceri detay dizisini düzleştir
                $stCopy = $st;
                $stCopy['negative_skills_summary'] = array_values($st['negative_skills']);
                $needsSupportList[] = $stCopy;
            }
        }

        // Sıralama: En düşük puana sahip olanlar en üstte, ardından negatif olay sayısı en çok olanlar
        usort($needsSupportList, function($a, $b) {
            if ($a['points'] !== $b['points']) return $a['points'] <=> $b['points']; // Artan sıra (en eksi en başta)
            return $b['negative_event_count'] <=> $a['negative_event_count'];
        });

        // 6. Sınıflar Sıralaması
        $classesRanking = array_values($classMap);
        foreach ($classesRanking as &$c) {
            $c['avg_points'] = $c['student_count'] > 0 ? round($c['total_points'] / $c['student_count'], 1) : 0.0;
        }
        unset($c);

        usort($classesRanking, function($a, $b) {
            if ($b['total_points'] !== $a['total_points']) return $b['total_points'] <=> $a['total_points'];
            return $b['avg_points'] <=> $a['avg_points'];
        });

        // Genel Özet Metrikleri
        $supportNeededCount = count($needsSupportList);
        $avgPerStudent = $totalStudents > 0 ? round($totalNetPoints / $totalStudents, 1) : 0.0;

        echo json_encode([
            'success' => true,
            'summary' => [
                'total_students' => $totalStudents,
                'total_points' => $totalNetPoints,
                'positive_points' => $posPointsTotal,
                'negative_points' => $negPointsTotal,
                'support_needed_count' => $supportNeededCount,
                'avg_points_per_student' => $avgPerStudent,
                'total_classes' => count($classMap),
                'top_class' => !empty($classesRanking) ? $classesRanking[0]['name'] : '-'
            ],
            'top_students' => $topStudents,
            'needs_support_students' => $needsSupportList,
            'classes_ranking' => $classesRanking,
            'skills_breakdown' => [
                'positive' => array_values($skillsCount['positive']),
                'needs_work' => array_values($skillsCount['needs_work'])
            ],
            'seasons' => $seasons,
            'active_season_id' => $seasonFilter,
            'classes_filter_list' => array_map(function($c) {
                return ['id' => $c['id'], 'name' => $c['name'], 'grade' => $c['grade']];
            }, array_values($classMap))
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // ACTION 2: RESET POINTS (PUANLARI SIFIRLA & YENİ AY REKABETİ BAŞLAT)
    // ==========================================
    if ($action === 'reset_points') {
        $title = isset($input['title']) && !empty(trim($input['title'])) ? trim($input['title']) : ('Aylık Puan Sıfırlama - ' . date('d.m.Y H:i'));
        $seasonId = isset($input['season_id']) && is_numeric($input['season_id']) ? (int)$input['season_id'] : null;

        // 1. Sıfırlanacak mevcut puan verilerinin anlık görüntüsünü (snapshot) al
        $stmt = $pdo->query("
            SELECT p.student_id, s.name as student_name, s.school_no, s.classroom_id, c.name as class_name, p.points, p.avatar_seed
            FROM classlem_student_points p
            JOIN students s ON p.student_id = s.id
            LEFT JOIN classrooms c ON s.classroom_id = c.id
            WHERE p.points != 0
            ORDER BY c.name, p.points DESC
        ");
        $snapshot = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $archiveId = 'archive_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3));
        $snapshotJson = json_encode([
            'metadata' => [
                'archive_id' => $archiveId,
                'title' => $title,
                'reset_date' => date('Y-m-d H:i:s'),
                'reset_by_id' => $user['id'],
                'reset_by_name' => $user['name'],
                'total_students_with_points' => count($snapshot)
            ],
            'records' => $snapshot
        ], JSON_UNESCAPED_UNICODE);

        $pdo->beginTransaction();

        // Arşiv tablosuna yaz
        $arcStmt = $pdo->prepare("
            INSERT INTO classlem_point_archives
            (id, season_id, title, reset_by_user_id, reset_by_user_name, total_students_affected, snapshot_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $arcStmt->execute([
            $archiveId,
            $seasonId,
            $title,
            $user['id'],
            $user['name'],
            count($snapshot),
            $snapshotJson
        ]);

        // Puanları sıfırla
        $pdo->exec("UPDATE classlem_student_points SET points = 0, updated_at = NOW()");

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Öğrenci puanları başarıyla sıfırlandı ve güvenli arşiv kaydı oluşturuldu. Yeni ay rekabeti başladı!',
            'archive_id' => $archiveId,
            'total_students_archived' => count($snapshot),
            'reset_by' => $user['name']
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // ACTION 3: GET ARCHIVES (GEÇMİŞ SIFIRLAMA ARŞİVLERİ LİSTESİ)
    // ==========================================
    if ($action === 'get_archives') {
        $stmt = $pdo->query("
            SELECT id, season_id, title, reset_by_user_id, reset_by_user_name, total_students_affected, created_at
            FROM classlem_point_archives
            ORDER BY created_at DESC
            LIMIT 20
        ");
        $archives = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'archives' => $archives
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    throw new Exception("Geçersiz işlem parametresi: $action");

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
