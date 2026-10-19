<?php
/**
 * QuizLem - Bağımsız PHP REST API Motoru
 * PHP 5.6, 7.x, 8.x ve LiteSpeed / Apache / Plesk ile %100 Geriye Dönük Uyumlu.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Beklenmeyen fatal hataları yakalayıp boş sayfa yerine JSON döndür
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR))) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'error' => 'Sunucu Hatası: ' . $error['message'] . ' (Satır: ' . $error['line'] . ')'
        ));
    }
});

// CORS ve Header Ayarları
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$JWT_SECRET = 'quizlem_ultra_secret_key_2026';

// ----------------------------------------------------
// 1. YARDIMCI FONKSİYONLAR (PHP 5.6 & 7 & 8 Uyumlu)
// ----------------------------------------------------
function getVal($arr, $key, $default = '') {
    if (is_array($arr) && array_key_exists($key, $arr) && $arr[$key] !== null) {
        return $arr[$key];
    }
    return $default;
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!$raw) return array();
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

function createJWT($payload) {
    global $JWT_SECRET;
    $header = json_encode(array('typ' => 'JWT', 'alg' => 'HS256'));
    $base64UrlHeader = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($header));
    $base64UrlPayload = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $JWT_SECRET, true);
    $base64UrlSignature = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($signature));
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($jwt) {
    global $JWT_SECRET;
    if (!$jwt) return null;
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    list($header64, $payload64, $sig64) = $parts;
    $expectedSig = hash_hmac('sha256', $header64 . "." . $payload64, $JWT_SECRET, true);
    $base64ExpectedSig = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($expectedSig));
    
    // PHP 5.6 uyumlu hash karşılaştırma
    if (function_exists('hash_equals')) {
        if (!hash_equals($base64ExpectedSig, $sig64)) return null;
    } else {
        if ($base64ExpectedSig !== $sig64) return null;
    }

    $payload = json_decode(base64_decode(str_replace(array('-', '_'), array('+', '/'), $payload64)), true);
    if (!$payload) return null;
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;
    return $payload;
}

// ----------------------------------------------------
// 2. VERİTABANI BAĞLANTISI (SQLite)
// ----------------------------------------------------
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0777, true);
}
@chmod($dataDir, 0777);

$dbPath = $dataDir . '/quizlem.db';
if (file_exists($dbPath)) {
    @chmod($dbPath, 0666);
}

try {
    if (!class_exists('PDO') || !in_array('sqlite', PDO::getAvailableDrivers())) {
        jsonResponse(array('error' => 'Sunucuda PHP SQLite (pdo_sqlite) sürücüsü bulunamadı. Lütfen Plesk PHP ayarlarından pdo_sqlite eklentisini açın.'), 500);
    }
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode = WAL;');
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS live_rooms (
            pin TEXT PRIMARY KEY,
            session_id INTEGER,
            quiz_id INTEGER,
            host_user_id INTEGER,
            quiz_title TEXT,
            total_questions INTEGER,
            state TEXT DEFAULT 'lobby',
            current_q_index INTEGER DEFAULT 0,
            q_start_time INTEGER DEFAULT 0,
            time_limit INTEGER DEFAULT 20,
            settings TEXT,
            updated_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS live_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin TEXT NOT NULL,
            nickname TEXT NOT NULL,
            avatar TEXT DEFAULT '🐱',
            score INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            last_answer TEXT,
            last_is_correct INTEGER DEFAULT 0,
            last_earned INTEGER DEFAULT 0,
            has_answered INTEGER DEFAULT 0,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS live_signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin TEXT NOT NULL,
            from_id TEXT NOT NULL,
            to_id TEXT NOT NULL,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
    ");
} catch (Exception $e) {
    jsonResponse(array('error' => 'Veritabanı bağlantı hatası: ' . $e->getMessage()), 500);
}

function getAuthUser($pdo) {
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) $authHeader = $headers['Authorization'];
        elseif (isset($headers['authorization'])) $authHeader = $headers['authorization'];
    }

    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        jsonResponse(array('error' => 'Giriş yapmanız gerekiyor.'), 401);
    }

    $token = $matches[1];
    $payload = verifyJWT($token);
    if (!$payload || !isset($payload['userId'])) {
        jsonResponse(array('error' => 'Geçersiz veya süresi dolmuş oturum.'), 403);
    }

    $stmt = $pdo->prepare('SELECT id, username, full_name, role FROM users WHERE id = ?');
    $stmt->execute(array($payload['userId']));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        jsonResponse(array('error' => 'Kullanıcı bulunamadı.'), 403);
    }
    return $user;
}

// ----------------------------------------------------
// 3. ROTA ÇÖZÜMLEME (ROUTE PARSING)
// ----------------------------------------------------
$endpoint = '';
if (isset($_GET['endpoint'])) {
    $endpoint = trim($_GET['endpoint'], '/');
} else {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pos = strpos($uri, '/api/');
    if ($pos !== false) {
        $endpoint = trim(substr($uri, $pos + 5), '/');
    }
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$parts = explode('/', $endpoint);
$resource = getVal($parts, 0, '');
$subId = getVal($parts, 1, '');
$action = getVal($parts, 2, '');

// ----------------------------------------------------
// 4. API İŞLEYİCİLERİ
// ----------------------------------------------------

// A. GÖRSEL YÜKLEME (/api/upload)
if ($resource === 'upload' && $method === 'POST') {
    $user = getAuthUser($pdo);
    $input = getJsonInput();
    $image = getVal($input, 'image', '');
    if (!$image) {
        jsonResponse(array('error' => 'Görsel verisi bulunamadı.'), 400);
    }

    $ext = 'png';
    $binary = null;
    if (preg_match('/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/', $image, $matches)) {
        $ext = ($matches[1] === 'jpeg') ? 'jpg' : $matches[1];
        $binary = base64_decode($matches[2]);
    } else {
        $binary = base64_decode($image);
    }

    if (!$binary) {
        jsonResponse(array('error' => 'Geçersiz görsel verisi.'), 400);
    }

    $uploadDir = __DIR__ . '/public/uploads';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }
    @chmod($uploadDir, 0777);

    $fileName = 'img_' . time() . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 7) . '.' . $ext;
    $targetPath = $uploadDir . '/' . $fileName;

    if (file_put_contents($targetPath, $binary) === false) {
        jsonResponse(array('error' => 'Görsel kaydedilemedi.'), 500);
    }
    @chmod($targetPath, 0666);

    jsonResponse(array(
        'success' => true,
        'url' => '/uploads/' . $fileName
    ));
}

// B. KULLANICI GİRİŞ & KAYIT (/api/auth/...)
if ($resource === 'auth') {
    if ($subId === 'login' && $method === 'POST') {
        $input = getJsonInput();
        $username = trim(getVal($input, 'username', ''));
        $password = trim(getVal($input, 'password', ''));

        if (!$username || !$password) {
            jsonResponse(array('error' => 'Kullanıcı adı ve şifre zorunludur.'), 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute(array($username));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(array('error' => 'Geçersiz kullanıcı adı veya şifre.'), 401);
        }

        $token = createJWT(array(
            'userId' => (int)$user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'exp' => time() + (86400 * 30)
        ));

        jsonResponse(array(
            'message' => 'Giriş başarılı',
            'token' => $token,
            'user' => array(
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'role' => $user['role']
            )
        ));
    }

    if ($subId === 'register' && $method === 'POST') {
        $input = getJsonInput();
        $username = trim(getVal($input, 'username', ''));
        $password = trim(getVal($input, 'password', ''));
        $full_name = trim(getVal($input, 'full_name', ''));

        if (!$username || !$password || !$full_name) {
            jsonResponse(array('error' => 'Lütfen tüm alanları doldurun.'), 400);
        }

        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute(array($username));
        if ($stmt->fetch()) {
            jsonResponse(array('error' => 'Bu kullanıcı adı zaten kullanılıyor.'), 400);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, 'teacher')");
        $stmt->execute(array($username, $hash, $full_name));
        $newId = (int)$pdo->lastInsertId();

        $token = createJWT(array(
            'userId' => $newId,
            'username' => $username,
            'role' => 'teacher',
            'exp' => time() + (86400 * 30)
        ));

        jsonResponse(array(
            'message' => 'Kayıt başarılı',
            'token' => $token,
            'user' => array(
                'id' => $newId,
                'username' => $username,
                'full_name' => $full_name,
                'role' => 'teacher'
            )
        ), 201);
    }

    if ($subId === 'me' && $method === 'GET') {
        $user = getAuthUser($pdo);
        jsonResponse(array('user' => $user));
    }
}

// C. TESTLER / QUİZZES (/api/quizzes/...)
if ($resource === 'quizzes') {
    $user = getAuthUser($pdo);

    // Listeleme (GET /api/quizzes)
    if ($subId === '' && $method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT q.*, 
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            WHERE q.user_id = ?
            ORDER BY q.created_at DESC
        ");
        $stmt->execute(array($user['id']));
        $quizzes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(array('quizzes' => $quizzes));
    }

    // Yeni Test Ekle (POST /api/quizzes)
    if ($subId === '' && $method === 'POST') {
        $input = getJsonInput();
        $title = trim(getVal($input, 'title', ''));
        $description = trim(getVal($input, 'description', ''));
        $category = trim(getVal($input, 'category', 'Genel'));
        $cover_color = trim(getVal($input, 'cover_color', 'indigo'));
        $questions = getVal($input, 'questions', array());

        if (!$title || !is_array($questions) || count($questions) === 0) {
            jsonResponse(array('error' => 'Test başlığı ve en az bir soru zorunludur.'), 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO quizzes (user_id, title, description, category, cover_color) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute(array($user['id'], $title, $description, $category, $cover_color));
            $quizId = (int)$pdo->lastInsertId();

            $qStmt = $pdo->prepare("
                INSERT INTO questions (quiz_id, question_text, question_type, options, correct_option, image_url, time_limit, points_multiplier, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($questions as $idx => $q) {
                $cVal = getVal($q, 'correct_option', 0);
                $correctOption = is_array($cVal) ? json_encode($cVal) : (string)$cVal;
                $optionsJson = json_encode(getVal($q, 'options', array()));

                $qStmt->execute(array(
                    $quizId,
                    getVal($q, 'question_text', ''),
                    getVal($q, 'question_type', 'multiple'),
                    $optionsJson,
                    $correctOption,
                    getVal($q, 'image_url', ''),
                    (int)getVal($q, 'time_limit', 20),
                    (int)getVal($q, 'points_multiplier', 1),
                    $idx
                ));
            }

            $pdo->commit();
            jsonResponse(array('message' => 'Test başarıyla oluşturuldu.', 'quizId' => $quizId), 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(array('error' => 'Test kaydedilemedi: ' . $e->getMessage()), 500);
        }
    }

    // Tekil Test Detayı (GET /api/quizzes/:id)
    if (is_numeric($subId) && $action === '' && $method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM quizzes WHERE id = ? AND user_id = ?");
        $stmt->execute(array((int)$subId, $user['id']));
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quiz) {
            jsonResponse(array('error' => 'Test bulunamadı.'), 404);
        }

        $qStmt = $pdo->prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC");
        $qStmt->execute(array((int)$subId));
        $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array();
        foreach ($questions as $q) {
            $opts = json_decode($q['options'], true);
            $c = json_decode($q['correct_option'], true);
            $formatted[] = array(
                'id' => (int)$q['id'],
                'quiz_id' => (int)$q['quiz_id'],
                'question_text' => $q['question_text'],
                'question_type' => $q['question_type'],
                'options' => is_array($opts) ? $opts : array(),
                'correct_option' => ($c !== null) ? $c : (is_numeric($q['correct_option']) ? (int)$q['correct_option'] : $q['correct_option']),
                'image_url' => getVal($q, 'image_url', ''),
                'time_limit' => (int)$q['time_limit'],
                'points_multiplier' => (int)$q['points_multiplier'],
                'order_index' => (int)$q['order_index']
            );
        }

        jsonResponse(array('quiz' => $quiz, 'questions' => $formatted));
    }

    // Test Güncelle (PUT /api/quizzes/:id)
    if (is_numeric($subId) && $method === 'PUT') {
        $quizId = (int)$subId;
        $stmt = $pdo->prepare("SELECT id FROM quizzes WHERE id = ? AND user_id = ?");
        $stmt->execute(array($quizId, $user['id']));
        if (!$stmt->fetch()) {
            jsonResponse(array('error' => 'Test bulunamadı.'), 404);
        }

        $input = getJsonInput();
        $title = trim(getVal($input, 'title', ''));
        $description = trim(getVal($input, 'description', ''));
        $category = trim(getVal($input, 'category', 'Genel'));
        $cover_color = trim(getVal($input, 'cover_color', 'indigo'));
        $questions = getVal($input, 'questions', array());

        if (!$title || !is_array($questions) || count($questions) === 0) {
            jsonResponse(array('error' => 'Test başlığı ve en az bir soru zorunludur.'), 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE quizzes SET title = ?, description = ?, category = ?, cover_color = ? WHERE id = ?");
            $stmt->execute(array($title, $description, $category, $cover_color, $quizId));

            $delStmt = $pdo->prepare("DELETE FROM questions WHERE quiz_id = ?");
            $delStmt->execute(array($quizId));

            $qStmt = $pdo->prepare("
                INSERT INTO questions (quiz_id, question_text, question_type, options, correct_option, image_url, time_limit, points_multiplier, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($questions as $idx => $q) {
                $cVal = getVal($q, 'correct_option', 0);
                $correctOption = is_array($cVal) ? json_encode($cVal) : (string)$cVal;
                $optionsJson = json_encode(getVal($q, 'options', array()));

                $qStmt->execute(array(
                    $quizId,
                    getVal($q, 'question_text', ''),
                    getVal($q, 'question_type', 'multiple'),
                    $optionsJson,
                    $correctOption,
                    getVal($q, 'image_url', ''),
                    (int)getVal($q, 'time_limit', 20),
                    (int)getVal($q, 'points_multiplier', 1),
                    $idx
                ));
            }

            $pdo->commit();
            jsonResponse(array('message' => 'Test başarıyla güncellendi.'));
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(array('error' => 'Güncelleme hatası: ' . $e->getMessage()), 500);
        }
    }

    // Test Sil (DELETE /api/quizzes/:id)
    if (is_numeric($subId) && $method === 'DELETE') {
        $quizId = (int)$subId;
        $stmt = $pdo->prepare("SELECT id FROM quizzes WHERE id = ? AND user_id = ?");
        $stmt->execute(array($quizId, $user['id']));
        if (!$stmt->fetch()) {
            jsonResponse(array('error' => 'Test bulunamadı.'), 404);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM questions WHERE quiz_id = ?")->execute(array($quizId));
            $pdo->prepare("DELETE FROM quizzes WHERE id = ?")->execute(array($quizId));
            $pdo->commit();
            jsonResponse(array('message' => 'Test başarıyla silindi.'));
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(array('error' => 'Test silinemedi.'), 500);
        }
    }
}

// D. RAPORLAR / REPORTS (/api/reports/...)
if ($resource === 'reports') {
    $user = getAuthUser($pdo);

    // Rapor Listesi (GET /api/reports)
    if ($subId === '' && $method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT s.*,
                   (SELECT nickname FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_name,
                   (SELECT avatar FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_avatar,
                   (SELECT total_score FROM game_players WHERE game_session_id = s.id AND final_rank = 1) AS winner_score,
                   (SELECT ROUND(AVG(accuracy_pct), 1) FROM game_players WHERE game_session_id = s.id) AS avg_accuracy
            FROM game_sessions s
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        ");
        $stmt->execute(array($user['id']));
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(array('reports' => $reports));
    }

    // CSV/Excel İndirme (GET /api/reports/:id/excel)
    if (is_numeric($subId) && $action === 'excel' && $method === 'GET') {
        $reportId = (int)$subId;
        $stmt = $pdo->prepare("SELECT * FROM game_sessions WHERE id = ? AND user_id = ?");
        $stmt->execute(array($reportId, $user['id']));
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            jsonResponse(array('error' => 'Rapor bulunamadı.'), 404);
        }

        $pStmt = $pdo->prepare("SELECT * FROM game_players WHERE game_session_id = ? ORDER BY final_rank ASC");
        $pStmt->execute(array($reportId));
        $players = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="QuizLem_Rapor_' . $reportId . '.csv"');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));

        fputcsv($out, array('QUIZLEM YARIŞMA RAPORU', $session['quiz_title']), ';');
        fputcsv($out, array('Oturum PIN', $session['pin'], 'Tarih', $session['created_at']), ';');
        fputcsv($out, array('Toplam Soru', $session['total_questions'], 'Katılımcı', $session['player_count']), ';');
        fputcsv($out, array(), ';');
        fputcsv($out, array('Sıra', 'Öğrenci Adı', 'Puan', 'Doğru', 'Yanlış', 'Başarı Oranı (%)'), ';');

        foreach ($players as $p) {
            fputcsv($out, array(
                $p['final_rank'],
                $p['nickname'],
                $p['total_score'],
                $p['correct_count'],
                $p['wrong_count'],
                '%' . $p['accuracy_pct']
            ), ';');
        }

        fclose($out);
        exit;
    }

    // Detaylı Rapor (GET /api/reports/:id)
    if (is_numeric($subId) && $action === '' && $method === 'GET') {
        $reportId = (int)$subId;
        $stmt = $pdo->prepare("SELECT * FROM game_sessions WHERE id = ? AND user_id = ?");
        $stmt->execute(array($reportId, $user['id']));
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$session) {
            jsonResponse(array('error' => 'Rapor bulunamadı.'), 404);
        }

        $pStmt = $pdo->prepare("SELECT * FROM game_players WHERE game_session_id = ? ORDER BY final_rank ASC");
        $pStmt->execute(array($reportId));
        $players = $pStmt->fetchAll(PDO::FETCH_ASSOC);

        $aStmt = $pdo->prepare("
            SELECT a.*, p.nickname, p.avatar, p.final_rank
            FROM game_answers a
            JOIN game_players p ON a.player_id = p.id
            WHERE a.game_session_id = ?
            ORDER BY a.question_index ASC, p.final_rank ASC
        ");
        $aStmt->execute(array($reportId));
        $answers = $aStmt->fetchAll(PDO::FETCH_ASSOC);

        $qStmt = $pdo->prepare("SELECT DISTINCT question_index, question_text, question_type FROM game_answers WHERE game_session_id = ? ORDER BY question_index ASC");
        $qStmt->execute(array($reportId));
        $rawQuestions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        $questions = array();
        foreach ($rawQuestions as $q) {
            $qAns = array();
            foreach ($answers as $a) {
                if ((int)$a['question_index'] === (int)$q['question_index']) {
                    $qAns[] = $a;
                }
            }
            $total = count($qAns);
            $correct = 0;
            $totalTime = 0;
            foreach ($qAns as $a) {
                if ((int)$a['is_correct'] === 1) $correct++;
                $totalTime += (int)$a['response_time_ms'];
            }
            $wrong = $total - $correct;
            $acc = $total > 0 ? round(($correct / $total) * 100) : 0;
            $avgTime = $total > 0 ? number_format($totalTime / $total / 1000, 1) : '0.0';

            $questions[] = array(
                'question_index' => (int)$q['question_index'],
                'question_text' => $q['question_text'],
                'question_type' => $q['question_type'],
                'totalAnswered' => $total,
                'correctCount' => $correct,
                'wrongCount' => $wrong,
                'accuracyPct' => $acc,
                'avgTimeSec' => $avgTime
            );
        }

        jsonResponse(array(
            'session' => $session,
            'players' => $players,
            'questions' => $questions,
            'answers' => $answers
        ));
    }

    // Rapor Sil (DELETE /api/reports/:id)
    if (is_numeric($subId) && $method === 'DELETE') {
        $reportId = (int)$subId;
        $stmt = $pdo->prepare("SELECT id FROM game_sessions WHERE id = ? AND user_id = ?");
        $stmt->execute(array($reportId, $user['id']));
        if (!$stmt->fetch()) {
            jsonResponse(array('error' => 'Rapor bulunamadı.'), 404);
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM game_answers WHERE game_session_id = ?")->execute(array($reportId));
            $pdo->prepare("DELETE FROM game_players WHERE game_session_id = ?")->execute(array($reportId));
            $pdo->prepare("DELETE FROM game_sessions WHERE id = ?")->execute(array($reportId));
            $pdo->commit();
            jsonResponse(array('message' => 'Rapor başarıyla silindi.'));
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(array('error' => 'Rapor silinemedi.'), 500);
        }
    }
}

// E. CANLI ODA & YARIŞMA YÖNETİMİ (/api/game/...)
if ($resource === 'game') {
    // 1. Oda Oluştur (POST /api/game/create)
    if ($subId === 'create' && $method === 'POST') {
        $user = getAuthUser($pdo);
        $input = getJsonInput();
        $quizId = (int)getVal($input, 'quizId', 0);
        if (!$quizId) {
            jsonResponse(array('error' => 'Geçersiz test ID.'), 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM quizzes WHERE id = ?');
        $stmt->execute(array($quizId));
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$quiz) {
            jsonResponse(array('error' => 'Test bulunamadı.'), 404);
        }

        $qStmt = $pdo->prepare('SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ?');
        $qStmt->execute(array($quizId));
        $qCount = (int)$qStmt->fetch(PDO::FETCH_ASSOC)['cnt'];
        if ($qCount === 0) {
            jsonResponse(array('error' => 'Bu teste ait soru bulunmuyor.'), 400);
        }

        $pin = (string)mt_rand(100000, 999999);

        // game_sessions kaydı
        $sStmt = $pdo->prepare('INSERT INTO game_sessions (pin, quiz_id, user_id, quiz_title, total_questions) VALUES (?, ?, ?, ?, ?)');
        $sStmt->execute(array($pin, $quizId, $user['id'], $quiz['title'], $qCount));
        $sessionId = (int)$pdo->lastInsertId();

        $defaultSettings = json_encode(array(
            'showQuestionsOnStudent' => false,
            'showOptionsTextOnStudent' => false,
            'shuffleQuestions' => false,
            'shuffleOptions' => false
        ));

        // Eski oda varsa temizle
        $pdo->prepare('DELETE FROM live_rooms WHERE pin = ?')->execute(array($pin));
        $pdo->prepare('DELETE FROM live_players WHERE pin = ?')->execute(array($pin));

        // Odayı kaydet
        $rStmt = $pdo->prepare('INSERT INTO live_rooms (pin, session_id, quiz_id, host_user_id, quiz_title, total_questions, state, current_q_index, q_start_time, time_limit, settings, updated_at) VALUES (?, ?, ?, ?, ?, ?, "lobby", 0, 0, 20, ?, ?)');
        $rStmt->execute(array($pin, $sessionId, $quizId, $user['id'], $quiz['title'], $qCount, $defaultSettings, time()));

        jsonResponse(array(
            'pin' => $pin,
            'sessionId' => $sessionId,
            'quizTitle' => $quiz['title'],
            'totalQuestions' => $qCount,
            'settings' => json_decode($defaultSettings, true)
        ));
    }

    // 2. Öğrenci Katıl (POST /api/game/join)
    if ($subId === 'join' && $method === 'POST') {
        $input = getJsonInput();
        $pin = trim(getVal($input, 'pin', ''));
        $nickname = trim(getVal($input, 'nickname', ''));
        $avatar = trim(getVal($input, 'avatar', '🐱'));

        if (!$pin || !$nickname) {
            jsonResponse(array('error' => 'PIN kodu ve rumuz zorunludur.'), 400);
        }

        $rStmt = $pdo->prepare('SELECT * FROM live_rooms WHERE pin = ?');
        $rStmt->execute(array($pin));
        $room = $rStmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            jsonResponse(array('error' => 'Bu PIN numarasına sahip bir yarışma odası bulunamadı.'), 404);
        }

        if ($room['state'] !== 'lobby') {
            jsonResponse(array('error' => 'Bu yarışma zaten başladı veya sona erdi.'), 400);
        }

        $pdo->prepare('DELETE FROM live_players WHERE pin = ? AND nickname = ?')->execute(array($pin, $nickname));

        $pStmt = $pdo->prepare('INSERT INTO live_players (pin, nickname, avatar, score, streak, has_answered, created_at) VALUES (?, ?, ?, 0, 0, 0, ?)');
        $pStmt->execute(array($pin, $nickname, $avatar, time()));

        $gpStmt = $pdo->prepare('INSERT INTO game_players (game_session_id, nickname, avatar, total_score, final_rank) VALUES (?, ?, ?, 0, 1)');
        $gpStmt->execute(array($room['session_id'], $nickname, $avatar));

        jsonResponse(array(
            'pin' => $pin,
            'nickname' => $nickname,
            'avatar' => $avatar,
            'quizTitle' => $room['quiz_title']
        ));
    }

    // 3. Canlı Durum Sorgulama (GET /api/game/status)
    if ($subId === 'status' && $method === 'GET') {
        $pin = trim(getVal($_GET, 'pin', ''));
        $role = trim(getVal($_GET, 'role', 'player'));
        $nickname = trim(getVal($_GET, 'nickname', ''));

        if (!$pin) {
            jsonResponse(array('error' => 'PIN belirtilmedi.'), 400);
        }

        $rStmt = $pdo->prepare('SELECT * FROM live_rooms WHERE pin = ?');
        $rStmt->execute(array($pin));
        $room = $rStmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            jsonResponse(array('error' => 'Oda bulunamadı.'), 404);
        }

        $lpStmt = $pdo->prepare('SELECT nickname, avatar, score, has_answered FROM live_players WHERE pin = ? ORDER BY score DESC');
        $lpStmt->execute(array($pin));
        $players = $lpStmt->fetchAll(PDO::FETCH_ASSOC);

        $answersReceived = 0;
        foreach ($players as $p) {
            if ((int)$p['has_answered'] === 1) $answersReceived++;
        }

        $nowMs = time() * 1000;
        $qStartTime = (int)$room['q_start_time'];
        $timeLimit = (int)$room['time_limit'];
        $elapsedSec = ($qStartTime > 0) ? floor(($nowMs - $qStartTime) / 1000) : 0;
        $timeLeft = max(0, $timeLimit - $elapsedSec);

        $state = $room['state'];
        if ($state === 'question' && ($timeLeft <= 0 || ($answersReceived >= count($players) && count($players) > 0))) {
            $state = 'summary';
            $pdo->prepare('UPDATE live_rooms SET state = "summary", updated_at = ? WHERE pin = ?')->execute(array(time(), $pin));
        }

        $currentQuestion = null;
        $summary = null;
        $podium = null;
        $lastResult = null;

        if ($state === 'question' || $state === 'summary') {
            $qIdx = (int)$room['current_q_index'];
            $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC LIMIT 1 OFFSET ?');
            $qStmt->execute(array($room['quiz_id'], $qIdx));
            $qRow = $qStmt->fetch(PDO::FETCH_ASSOC);

            if ($qRow) {
                $opts = json_decode($qRow['options'], true);
                if (!is_array($opts)) $opts = array();

                $correctOpt = json_decode($qRow['correct_option'], true);
                if ($correctOpt === null) {
                    $correctOpt = is_numeric($qRow['correct_option']) ? (int)$qRow['correct_option'] : $qRow['correct_option'];
                }

                $currentQuestion = array(
                    'questionIndex' => $qIdx,
                    'totalQuestions' => (int)$room['total_questions'],
                    'questionText' => $qRow['question_text'],
                    'questionType' => $qRow['question_type'],
                    'options' => $opts,
                    'imageUrl' => $qRow['image_url'],
                    'timeLimit' => $timeLimit,
                    'timeLeft' => $timeLeft,
                    'pointsMultiplier' => (int)$qRow['points_multiplier']
                );

                if ($role === 'host' || $state === 'summary') {
                    $currentQuestion['correctOption'] = $correctOpt;
                }

                if ($qRow['question_type'] === 'order') {
                    $items = array();
                    foreach ($opts as $idx => $opt) {
                        $items[] = array('id' => $idx, 'text' => $opt);
                    }
                    $currentQuestion['shuffledItems'] = $items;
                }

                if ($state === 'summary') {
                    $ansStmt = $pdo->prepare('SELECT * FROM game_answers WHERE game_session_id = ? AND question_index = ?');
                    $ansStmt->execute(array($room['session_id'], $qIdx));
                    $allAnswers = $ansStmt->fetchAll(PDO::FETCH_ASSOC);

                    $correctCount = 0;
                    $wrongCount = 0;
                    $optionCounts = array_fill(0, count($opts), 0);

                    foreach ($allAnswers as $a) {
                        if ((int)$a['is_correct'] === 1) $correctCount++;
                        else $wrongCount++;

                        $sub = (int)$a['submitted_answer'];
                        if (isset($optionCounts[$sub])) $optionCounts[$sub]++;
                    }

                    $summary = array(
                        'questionIndex' => $qIdx,
                        'totalQuestions' => (int)$room['total_questions'],
                        'questionText' => $qRow['question_text'],
                        'questionType' => $qRow['question_type'],
                        'options' => $opts,
                        'correctOption' => $correctOpt,
                        'optionCounts' => $optionCounts,
                        'correctCount' => $correctCount,
                        'wrongCount' => $wrongCount,
                        'totalAnswers' => count($allAnswers)
                    );
                }
            }
        }

        if ($state === 'podium') {
            $topStmt = $pdo->prepare('SELECT nickname, avatar, score FROM live_players WHERE pin = ? ORDER BY score DESC');
            $topStmt->execute(array($pin));
            $allRanks = $topStmt->fetchAll(PDO::FETCH_ASSOC);

            $formattedAll = array();
            foreach ($allRanks as $i => $p) {
                $formattedAll[] = array(
                    'rank' => $i + 1,
                    'nickname' => $p['nickname'],
                    'avatar' => $p['avatar'],
                    'score' => (int)$p['score']
                );
            }

            $podium = array(
                'first' => isset($formattedAll[0]) ? $formattedAll[0] : null,
                'second' => isset($formattedAll[1]) ? $formattedAll[1] : null,
                'third' => isset($formattedAll[2]) ? $formattedAll[2] : null,
                'allPlayers' => $formattedAll
            );
        }

        if ($nickname) {
            $meStmt = $pdo->prepare('SELECT * FROM live_players WHERE pin = ? AND nickname = ?');
            $meStmt->execute(array($pin, $nickname));
            $me = $meStmt->fetch(PDO::FETCH_ASSOC);
            if ($me) {
                $rank = 1;
                foreach ($players as $idx => $p) {
                    if ($p['nickname'] === $nickname) {
                        $rank = $idx + 1;
                        break;
                    }
                }

                $lastResult = array(
                    'isCorrect' => (int)$me['last_is_correct'] === 1,
                    'earnedPoints' => (int)$me['last_earned'],
                    'totalScore' => (int)$me['score'],
                    'rank' => $rank,
                    'streak' => (int)$me['streak']
                );
            }
        }

        jsonResponse(array(
            'pin' => $pin,
            'quizTitle' => $room['quiz_title'],
            'sessionId' => (int)$room['session_id'],
            'state' => $state,
            'currentQuestionIndex' => (int)$room['current_q_index'],
            'totalQuestions' => (int)$room['total_questions'],
            'players' => $players,
            'answersReceived' => $answersReceived,
            'currentQuestion' => $currentQuestion,
            'summary' => $summary,
            'podium' => $podium,
            'lastResult' => $lastResult
        ));
    }

    // 4. Canlı Eylemler (POST /api/game/action)
    if ($subId === 'action' && $method === 'POST') {
        $input = getJsonInput();
        $pin = trim(getVal($input, 'pin', ''));
        $action = trim(getVal($input, 'action', ''));

        if (!$pin || !$action) {
            jsonResponse(array('error' => 'Eksik parametre.'), 400);
        }

        $rStmt = $pdo->prepare('SELECT * FROM live_rooms WHERE pin = ?');
        $rStmt->execute(array($pin));
        $room = $rStmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            jsonResponse(array('error' => 'Oda bulunamadı.'), 404);
        }

        if ($action === 'start') {
            $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC LIMIT 1');
            $qStmt->execute(array($room['quiz_id']));
            $firstQ = $qStmt->fetch(PDO::FETCH_ASSOC);
            $limit = $firstQ ? (int)$firstQ['time_limit'] : 20;

            $pdo->prepare('UPDATE live_rooms SET state = "question", current_q_index = 0, time_limit = ?, q_start_time = ?, updated_at = ? WHERE pin = ?')
                ->execute(array($limit, time() * 1000, time(), $pin));

            $pdo->prepare('UPDATE live_players SET has_answered = 0, last_answer = NULL, last_is_correct = 0, last_earned = 0 WHERE pin = ?')
                ->execute(array($pin));

            jsonResponse(array('success' => true));
        }

        if ($action === 'next_question') {
            $nextIdx = (int)$room['current_q_index'] + 1;
            $totalQ = (int)$room['total_questions'];

            if ($nextIdx >= $totalQ) {
                $pdo->prepare('UPDATE live_rooms SET state = "podium", updated_at = ? WHERE pin = ?')->execute(array(time(), $pin));

                $lpStmt = $pdo->prepare('SELECT nickname, avatar, score FROM live_players WHERE pin = ? ORDER BY score DESC');
                $lpStmt->execute(array($pin));
                $allPlayers = $lpStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($allPlayers as $rankIdx => $p) {
                    $rank = $rankIdx + 1;
                    $pdo->prepare('UPDATE game_players SET total_score = ?, final_rank = ? WHERE game_session_id = ? AND nickname = ?')
                        ->execute(array((int)$p['score'], $rank, $room['session_id'], $p['nickname']));
                }

                $pdo->prepare('UPDATE game_sessions SET finished_at = CURRENT_TIMESTAMP, player_count = ? WHERE id = ?')
                    ->execute(array(count($allPlayers), $room['session_id']));

                jsonResponse(array('success' => true, 'isEnd' => true));
            } else {
                $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC LIMIT 1 OFFSET ?');
                $qStmt->execute(array($room['quiz_id'], $nextIdx));
                $nextQ = $qStmt->fetch(PDO::FETCH_ASSOC);
                $limit = $nextQ ? (int)$nextQ['time_limit'] : 20;

                $pdo->prepare('UPDATE live_rooms SET state = "question", current_q_index = ?, time_limit = ?, q_start_time = ?, updated_at = ? WHERE pin = ?')
                    ->execute(array($nextIdx, $limit, time() * 1000, time(), $pin));

                $pdo->prepare('UPDATE live_players SET has_answered = 0, last_answer = NULL, last_is_correct = 0, last_earned = 0 WHERE pin = ?')
                    ->execute(array($pin));

                jsonResponse(array('success' => true, 'isEnd' => false));
            }
        }

        if ($action === 'submit_answer') {
            $nickname = trim(getVal($input, 'nickname', ''));
            $answer = getVal($input, 'answer', null);

            $lpStmt = $pdo->prepare('SELECT * FROM live_players WHERE pin = ? AND nickname = ?');
            $lpStmt->execute(array($pin, $nickname));
            $player = $lpStmt->fetch(PDO::FETCH_ASSOC);

            if (!$player || (int)$player['has_answered'] === 1) {
                jsonResponse(array('success' => true, 'message' => 'Cevap zaten kaydedildi.'));
            }

            $qIdx = (int)$room['current_q_index'];
            $qStmt = $pdo->prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC LIMIT 1 OFFSET ?');
            $qStmt->execute(array($room['quiz_id'], $qIdx));
            $qRow = $qStmt->fetch(PDO::FETCH_ASSOC);

            $isCorrect = false;
            if ($qRow) {
                $qType = $qRow['question_type'];
                $correctOpt = $qRow['correct_option'];

                if ($qType === 'boolean') {
                    $isCorrect = ((int)$answer === (int)$correctOpt);
                } elseif ($qType === 'fill_blank') {
                    $cleanAns = mb_strtolower(trim((string)$answer), 'UTF-8');
                    $cleanTarget = mb_strtolower(trim((string)$correctOpt), 'UTF-8');
                    $isCorrect = ($cleanAns === $cleanTarget);
                } elseif ($qType === 'order') {
                    $subArr = is_array($answer) ? array_map('intval', $answer) : array();
                    $tArr = json_decode($correctOpt, true);
                    if (!is_array($tArr)) $tArr = array(0, 1, 2, 3);
                    $isCorrect = ($subArr == $tArr);
                } elseif ($qType === 'multiselect') {
                    $subArr = is_array($answer) ? array_map('intval', $answer) : array((int)$answer);
                    sort($subArr);
                    $tArr = json_decode($correctOpt, true);
                    if (!is_array($tArr)) $tArr = array((int)$correctOpt);
                    sort($tArr);
                    $isCorrect = ($subArr == $tArr);
                } else {
                    $isCorrect = ((int)$answer === (int)$correctOpt);
                }
            }

            $timeSpentMs = max(0, (time() * 1000) - (int)$room['q_start_time']);
            $totalTimeMs = (int)$room['time_limit'] * 1000;
            $timeFactor = max(0.5, 1 - ($timeSpentMs / $totalTimeMs) / 2);
            $multiplier = $qRow ? (int)$qRow['points_multiplier'] : 1;
            $earned = $isCorrect ? (int)round(1000 * $multiplier * $timeFactor) : 0;

            $streak = $isCorrect ? ((int)$player['streak'] + 1) : 0;
            if ($streak > 1) $earned += ($streak - 1) * 50;

            $newScore = (int)$player['score'] + $earned;

            $pdo->prepare('UPDATE live_players SET score = ?, streak = ?, has_answered = 1, last_answer = ?, last_is_correct = ?, last_earned = ? WHERE id = ?')
                ->execute(array($newScore, $streak, json_encode($answer), $isCorrect ? 1 : 0, $earned, $player['id']));

            $pdo->prepare('INSERT INTO game_answers (game_session_id, player_id, question_index, question_text, question_type, submitted_answer, is_correct, earned_points, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute(array(
                    $room['session_id'],
                    $player['id'],
                    $qIdx,
                    $qRow ? $qRow['question_text'] : '',
                    $qRow ? $qRow['question_type'] : 'multiple',
                    json_encode($answer),
                    $isCorrect ? 1 : 0,
                    $earned,
                    $timeSpentMs
                ));

            jsonResponse(array(
                'success' => true,
                'isCorrect' => $isCorrect,
                'earnedPoints' => $earned,
                'totalScore' => $newScore
            ));
        }

        if ($action === 'update_settings') {
            $settings = getVal($input, 'settings', array());
            $pdo->prepare('UPDATE live_rooms SET settings = ?, updated_at = ? WHERE pin = ?')
                ->execute(array(json_encode($settings), time(), $pin));
            jsonResponse(array('success' => true));
        }

        jsonResponse(array('error' => 'Bilinmeyen eylem: ' . $action), 400);
    }

    // 5. WebRTC Canlı Ses Sinyali Gönder (POST /api/game/signal)
    if ($subId === 'signal' && $method === 'POST') {
        $input = getJsonInput();
        $pin = trim(getVal($input, 'pin', ''));
        $fromId = trim(getVal($input, 'from', ''));
        $toId = trim(getVal($input, 'to', 'all'));
        $type = trim(getVal($input, 'type', ''));
        $payload = getVal($input, 'payload', array());

        if (!$pin || !$fromId || !$type) {
            jsonResponse(array('error' => 'Eksik sinyal parametresi.'), 400);
        }

        $pdo->prepare('DELETE FROM live_signals WHERE created_at < ?')->execute(array(time() - 300));

        $stmt = $pdo->prepare('INSERT INTO live_signals (pin, from_id, to_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute(array($pin, $fromId, $toId, $type, json_encode($payload), time()));

        jsonResponse(array('success' => true));
    }

    // 6. WebRTC Canlı Ses Sinyallerini Oku (GET /api/game/signals)
    if ($subId === 'signals' && $method === 'GET') {
        $pin = trim(getVal($_GET, 'pin', ''));
        $toId = trim(getVal($_GET, 'to', ''));
        $lastId = (int)getVal($_GET, 'last_id', 0);

        if (!$pin || !$toId) {
            jsonResponse(array('error' => 'Eksik parametre.'), 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM live_signals WHERE pin = ? AND (to_id = ? OR to_id = "all") AND id > ? ORDER BY id ASC LIMIT 50');
        $stmt->execute(array($pin, $toId, $lastId));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $signals = array();
        foreach ($rows as $r) {
            $signals[] = array(
                'id' => (int)$r['id'],
                'from' => $r['from_id'],
                'to' => $r['to_id'],
                'type' => $r['type'],
                'payload' => json_decode($r['payload'], true)
            );
        }

        jsonResponse(array('signals' => $signals));
    }
}

// Eşleşmeyen Uç Noktalar
jsonResponse(array('error' => "Bilinmeyen API uç noktası: $method /api/$endpoint"), 404);

