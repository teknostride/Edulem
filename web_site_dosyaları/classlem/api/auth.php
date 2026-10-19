<?php
/**
 * Classlem - Edulem Kimlik Doğrulama Uç Noktası (auth.php)
 * Edulem MySQL 'users' tablosundan T.C. Kimlik No ve şifre ile giriş yapılmasını sağlar.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

/**
 * Classlem Rol Yetkilendirme Yardımcısı
 * İdarecilere, kurucuya, rehber öğretmenlere ve öğrenci işlerine tüm sınıfları görme
 * ve raporlama/sıfırlama yetkisi tanımlar.
 */
function getClasslemUserPermissions($user) {
    $roleName = trim($user['role_name'] ?? '');
    $roleDisplay = trim($user['role_display'] ?? '');
    $isSuperAdmin = !empty($user['is_superadmin']);

    // Tüm sınıfları görebilen ve raporlara erişebilen roller:
    // İdareciler, kurucu, rehber öğretmenler ve öğrenci işleri
    $allClassRoles = [
        'owner', 'Kurum Sahibi',
        'Genel Müdür',
        'Kampüs Müdürü',
        'Müdür',
        'Müdür Yardımcısı',
        'Rehberlik',
        'Öğrenci İşleri'
    ];

    $canViewAllClasses = $isSuperAdmin
        || in_array($roleName, $allClassRoles)
        || in_array($roleDisplay, $allClassRoles);

    // Raporlama ve Puan Sıfırlama yetkileri
    $canViewReports = $canViewAllClasses;
    $canResetPoints = $canViewAllClasses;

    $adminRoles = ['owner', 'Kurum Sahibi', 'Genel Müdür', 'Kampüs Müdürü', 'Müdür', 'Müdür Yardımcısı'];
    $isAdmin = $isSuperAdmin
        || in_array($roleName, $adminRoles)
        || in_array($roleDisplay, $adminRoles);

    return [
        'is_admin' => $isAdmin,
        'can_view_all_classes' => $canViewAllClasses,
        'can_view_reports' => $canViewReports,
        'can_reset_points' => $canResetPoints
    ];
}

if (!defined('AUTH_LIB_MODE')) {

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true) ?: [];
$input = array_merge($_GET, $_POST, $jsonInput);

$action = isset($input['action']) ? trim($input['action']) : 'check';

try {
    $pdo = getEdulemPdo();

    // ==========================================
    // 1. GİRİŞ YAPMA (LOGIN)
    // ==========================================
    if ($action === 'login') {
        $tcNo = isset($input['tc_no']) ? preg_replace('/\D/', '', (string)$input['tc_no']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';

        if (empty($tcNo) || strlen($tcNo) !== 11) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (empty($password)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Lütfen şifrenizi giriniz.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Kullanıcıyı Edulem users tablosundan çek
        $sql = "
            SELECT u.id, u.tenant_id, u.tc_no, u.name, u.email, u.password, u.role_id,
                   u.is_active, u.is_superadmin, u.avatar, u.teacher_type, u.department,
                   r.name AS role_name, r.display_name AS role_display
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.tc_no = :tc_no
            LIMIT 1
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':tc_no' => $tcNo]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Bu T.C. Kimlik Numarasına ait kullanıcı bulunamadı.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (empty($user['is_active'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error' => 'Kullanıcı hesabınız pasif durumdadır. Lütfen okul idaresi ile görüşün.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Edulem Bcrypt Şifre Doğrulaması
        if (!password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'T.C. Kimlik Numarası veya şifre hatalı.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Yetkilendirme & Rol Kontrolü (İdareciler, Kurucu, Rehberlik, Öğrenci İşleri)
        $perms = getClasslemUserPermissions($user);

        // Oturumu kaydet
        $_SESSION['classlem_user_id'] = (int)$user['id'];
        $_SESSION['classlem_user_name'] = $user['name'];
        $_SESSION['classlem_user_role'] = $user['role_display'] ?: $user['role_name'] ?: 'Öğretmen';
        $_SESSION['classlem_is_admin'] = $perms['is_admin'];
        $_SESSION['classlem_can_view_all'] = $perms['can_view_all_classes'];
        $_SESSION['classlem_can_reports'] = $perms['can_view_reports'];
        $_SESSION['classlem_can_reset'] = $perms['can_reset_points'];

        $token = bin2hex(random_bytes(24));
        $_SESSION['classlem_token'] = $token;

        echo json_encode([
            'success' => true,
            'message' => 'Giriş başarılı.',
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'tc_no' => $user['tc_no'],
                'email' => $user['email'],
                'avatar' => $user['avatar'] ?: null,
                'role' => $user['role_display'] ?: $user['role_name'] ?: 'Öğretmen',
                'role_name' => $user['role_name'],
                'department' => $user['department'] ?: $user['teacher_type'] ?: '',
                'is_admin' => $perms['is_admin'],
                'can_view_all_classes' => $perms['can_view_all_classes'],
                'can_view_reports' => $perms['can_view_reports'],
                'can_reset_points' => $perms['can_reset_points']
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // 2. OTURUM KONTROLÜ (CHECK / ME)
    // ==========================================
    if ($action === 'check' || $action === 'me') {
        $userId = null;
        if (!empty($_SESSION['classlem_user_id'])) {
            $userId = (int)$_SESSION['classlem_user_id'];
        } elseif (!empty($input['user_id'])) {
            $userId = (int)$input['user_id'];
        }

        if (!$userId) {
            echo json_encode([
                'success' => true,
                'authenticated' => false
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $sql = "
            SELECT u.id, u.tenant_id, u.tc_no, u.name, u.email, u.role_id,
                   u.is_active, u.is_superadmin, u.avatar, u.teacher_type, u.department,
                   r.name AS role_name, r.display_name AS role_display
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = :id AND u.is_active = 1
            LIMIT 1
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            unset($_SESSION['classlem_user_id']);
            echo json_encode([
                'success' => true,
                'authenticated' => false
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $perms = getClasslemUserPermissions($user);

        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'tc_no' => $user['tc_no'],
                'email' => $user['email'],
                'avatar' => $user['avatar'] ?: null,
                'role' => $user['role_display'] ?: $user['role_name'] ?: 'Öğretmen',
                'role_name' => $user['role_name'],
                'department' => $user['department'] ?: $user['teacher_type'] ?: '',
                'is_admin' => $perms['is_admin'],
                'can_view_all_classes' => $perms['can_view_all_classes'],
                'can_view_reports' => $perms['can_view_reports'],
                'can_reset_points' => $perms['can_reset_points']
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ==========================================
    // 3. ÇIKIŞ YAPMA (LOGOUT)
    // ==========================================
    if ($action === 'logout') {
        unset($_SESSION['classlem_user_id']);
        unset($_SESSION['classlem_user_name']);
        unset($_SESSION['classlem_user_role']);
        unset($_SESSION['classlem_is_admin']);
        unset($_SESSION['classlem_token']);

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }

        echo json_encode([
            'success' => true,
            'message' => 'Başarıyla çıkış yapıldı.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    throw new Exception("Geçersiz işlem parametresi: $action");

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

} // End of !defined('AUTH_LIB_MODE')
