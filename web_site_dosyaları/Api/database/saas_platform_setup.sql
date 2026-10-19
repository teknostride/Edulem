-- ==========================================================
-- EDULEM SAAS PLATFORM YÖNETİMİ - VERİTABANI KURULUM VE GÜNCELLEME
-- ==========================================================

-- 1. TENANTS tablosuna kurumsal CRM, fatura ve sözleşme alanları ekleme
ALTER TABLE `tenants` 
  ADD COLUMN IF NOT EXISTS `official_title` VARCHAR(255) NULL COMMENT 'Resmi Ticari / Şirket Unvanı',
  ADD COLUMN IF NOT EXISTS `authorized_person` VARCHAR(255) NULL COMMENT 'Yetkili Kişi (Kurucu / Müdür)',
  ADD COLUMN IF NOT EXISTS `authorized_phone` VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS `authorized_email` VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS `accounting_phone` VARCHAR(50) NULL COMMENT 'Muhasebe İletişim Numarası',
  ADD COLUMN IF NOT EXISTS `tax_office` VARCHAR(100) NULL COMMENT 'Vergi Dairesi',
  ADD COLUMN IF NOT EXISTS `tax_number` VARCHAR(50) NULL COMMENT 'Vergi No / T.C.',
  ADD COLUMN IF NOT EXISTS `address` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `district` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `contract_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Yıllık Sözleşme Tutarı',
  ADD COLUMN IF NOT EXISTS `contract_start_date` DATE NULL,
  ADD COLUMN IF NOT EXISTS `contract_end_date` DATE NULL,
  ADD COLUMN IF NOT EXISTS `notes` TEXT NULL;

-- 2. SAAS_MODULES tablosu (Dinamik *lem Ürün Kataloğu)
CREATE TABLE IF NOT EXISTS `saas_modules` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'quizlem, keylem, classlem, rahlem vb.',
  `name` VARCHAR(100) NOT NULL COMMENT 'Görünen Ad',
  `description` TEXT NULL,
  `icon` VARCHAR(50) DEFAULT 'ti-apps',
  `badge_color` VARCHAR(30) DEFAULT 'primary',
  `annual_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Varsayılan Yıllık Satış Fiyatı',
  `monthly_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Varsayılan Aylık Fiyat',
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TENANT_MODULE_LICENSES tablosu (Okul Lisansları)
CREATE TABLE IF NOT EXISTS `tenant_module_licenses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `module_code` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Açık / Kapalı anahtarı',
  `agreed_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Okula Özel Anlaşılan Fiyat',
  `starts_at` DATE NULL,
  `expires_at` DATE NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `tenant_module_unique` (`tenant_id`, `module_code`),
  CONSTRAINT `fk_tml_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TENANT_PAYMENTS tablosu (Okullardan Alınan Ücretler & Taksitler)
CREATE TABLE IF NOT EXISTS `tenant_payments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL COMMENT '1. Taksit, Peşinat, Yıllık Lisans vb.',
  `amount` DECIMAL(12,2) NOT NULL COMMENT 'Taksit Tutarı',
  `due_date` DATE NOT NULL COMMENT 'Vade Tarihi',
  `paid_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Ödenen Miktar',
  `paid_at` DATE NULL COMMENT 'Ödeme Tarihi',
  `payment_method` VARCHAR(50) NULL COMMENT 'havale, eft, kredi_karti, nakit, cek',
  `status` ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  `receipt_no` VARCHAR(100) NULL COMMENT 'Dekont No / Fiş',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_tenant_status` (`tenant_id`, `status`),
  KEY `idx_due_date` (`due_date`),
  CONSTRAINT `fk_tp_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. SAAS_EXPENSES tablosu (EduLem Şirket Giderleri)
CREATE TABLE IF NOT EXISTS `saas_expenses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL COMMENT 'sunucu_hosting, sms_maliyeti, domain_ssl, yazilim_api, personel, ofis_muhasebe, diger',
  `title` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `receipt_no` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_category_date` (`category`, `expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. USERS tablosuna SaaS Personel Rolü Alanı
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `saas_role` VARCHAR(50) NULL COMMENT 'super_admin (patron), technical_support (destek), finance (muhasebe), sales (satış)' AFTER `is_superadmin`;

-- 8. Mevcut Süper Admin kullanıcısını 'super_admin' rolü ile damgala
UPDATE `users` SET `saas_role` = 'super_admin' WHERE `is_superadmin` = 1;

-- 9. SAAS_AUDIT_LOGS tablosu (İşlem ve Destek Giriş Kayıtları)
CREATE TABLE IF NOT EXISTS `saas_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'impersonate_start, impersonate_stop, tenant_created, tenant_deleted, payment_recorded, license_changed',
  `target_tenant_id` BIGINT UNSIGNED NULL,
  `target_tenant_name` VARCHAR(150) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_user_action` (`user_id`, `action`),
  KEY `idx_target_tenant` (`target_tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
