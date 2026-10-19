<?php
/**
 * Classlem - Tablo Başlatıcı (init_tables.php)
 * Classlem için gerekli puan, geçmiş ve grup tablolarını oluşturur.
 */

require_once __DIR__ . '/db.php';

function initClasslemTables($pdo) {
    // 1. Öğrenci Puanları ve Avatarları
    $pdo->exec("CREATE TABLE IF NOT EXISTS `classlem_student_points` (
        `student_id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        `classroom_id` BIGINT UNSIGNED NULL,
        `points` INT NOT NULL DEFAULT 0,
        `avatar_seed` VARCHAR(64) NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_classroom (`classroom_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 2. Davranış & Puan Geçmişi
    $pdo->exec("CREATE TABLE IF NOT EXISTS `classlem_history` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `classroom_id` BIGINT UNSIGNED NOT NULL,
        `student_ids` TEXT NOT NULL,
        `student_names` TEXT NOT NULL,
        `skill_title` VARCHAR(255) NOT NULL,
        `skill_icon` VARCHAR(50) NOT NULL,
        `points` INT NOT NULL,
        `type` VARCHAR(50) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_class_created (`classroom_id`, `created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 3. Masa / Çalışma Grupları
    $pdo->exec("CREATE TABLE IF NOT EXISTS `classlem_groups` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `classroom_id` BIGINT UNSIGNED NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `student_ids` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_class (`classroom_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 4. Özel Beceriler (İsteğe bağlı)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `classlem_skills` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `points` INT NOT NULL DEFAULT 1,
        `icon` VARCHAR(50) NOT NULL DEFAULT '⭐',
        `type` VARCHAR(50) NOT NULL DEFAULT 'positive',
        `sort_order` INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 5. Puan Sıfırlama ve Aylık Arşiv Tablosu
    $pdo->exec("CREATE TABLE IF NOT EXISTS `classlem_point_archives` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `season_id` BIGINT UNSIGNED NULL,
        `title` VARCHAR(255) NOT NULL DEFAULT 'Aylık Sıfırlama',
        `reset_by_user_id` BIGINT UNSIGNED NOT NULL,
        `reset_by_user_name` VARCHAR(255) NOT NULL,
        `total_students_affected` INT NOT NULL DEFAULT 0,
        `snapshot_json` LONGTEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
}

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    header('Content-Type: application/json; charset=utf-8');
    try {
        $pdo = getEdulemPdo();
        initClasslemTables($pdo);
        echo json_encode(['success' => true, 'message' => 'Classlem tabloları başarıyla hazırlandı.']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
