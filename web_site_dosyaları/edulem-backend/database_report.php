<?php
/**
 * Veritabanı Raporu Oluşturucu
 * Tüm tabloları, kayıt sayılarını ve örnek verileri listeler
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "========================================\n";
echo "   VERİTABANI DETAYLI RAPORU\n";
echo "========================================\n\n";

// Veritabanı bağlantı bilgisi
$connection = DB::connection();
$databaseName = $connection->getDatabaseName();
echo "📊 Veritabanı: {$databaseName}\n";
echo "🔗 Bağlantı: " . $connection->getDriverName() . "\n\n";

// Tüm tabloları al
$tables = DB::select("SHOW TABLES");
$tableKey = "Tables_in_{$databaseName}";

$totalRecords = 0;
$report = [];

foreach ($tables as $table) {
    $tableName = $table->$tableKey;
    
    // Tablo kayıt sayısı
    $count = DB::table($tableName)->count();
    $totalRecords += $count;
    
    // Tablo sütunları
    $columns = DB::select("DESCRIBE `{$tableName}`");
    
    // Örnek kayıtlar (maksimum 3)
    $sampleRecords = DB::table($tableName)->limit(3)->get();
    
    $report[$tableName] = [
        'count' => $count,
        'columns' => $columns,
        'samples' => $sampleRecords,
    ];
}

// Raporu yazdır
echo "📋 TOPLAM TABLO SAYISI: " . count($tables) . "\n";
echo "📊 TOPLAM KAYIT SAYISI: " . number_format($totalRecords) . "\n\n";

// Tabloları kategoriye göre grupla
$categories = [
    'Sistem Tabloları' => ['tenants', 'users', 'roles', 'permissions', 'role_permission', 'activity_logs', 'settings', 'notifications', 'files'],
    'Lokasyon Tabloları' => ['cities', 'districts'],
    'Kampüs/Kurum Tabloları' => ['campuses', 'branches', 'education_levels', 'education_level_time_slots', 'user_campus_branch_assignments'],
    'Kişiler Tabloları' => ['guardians', 'guardian_student', 'students'],
    'Akademik Tabloları' => ['classrooms', 'lessons', 'schedules', 'attendances', 'exams', 'grades', 'academic_years'],
    'Finans Tabloları' => ['contracts', 'payments', 'installments', 'installment_payments', 'expenses', 'invoices'],
    'SaaS Tabloları' => ['saas_revenues', 'saas_expenses', 'packages', 'subscriptions', 'subscription_modules'],
    'CRM Tabloları' => ['leads', 'appointments'],
    'İletişim Tabloları' => ['questions', 'internal_messages', 'message_recipients', 'announcements'],
    'Yetkilendirme Tabloları' => ['user_campus_permissions', 'user_branch_permissions', 'user_module_permissions'],
    'Diğer Tabloları' => [],
];

foreach ($categories as $categoryName => $categoryTables) {
    $categoryData = [];
    foreach ($categoryTables as $tableName) {
        if (isset($report[$tableName])) {
            $categoryData[$tableName] = $report[$tableName];
        }
    }
    
    // Kategorideki tabloları bul
    if (empty($categoryData) && $categoryName === 'Diğer Tabloları') {
        foreach ($report as $tableName => $data) {
            $found = false;
            foreach ($categories as $catName => $catTables) {
                if ($catName !== 'Diğer Tabloları' && in_array($tableName, $catTables)) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $categoryData[$tableName] = $data;
            }
        }
    }
    
    if (!empty($categoryData)) {
        echo "\n" . str_repeat("=", 50) . "\n";
        echo "📁 {$categoryName}\n";
        echo str_repeat("=", 50) . "\n\n";
        
        foreach ($categoryData as $tableName => $data) {
            echo "┌─ Tablo: {$tableName}\n";
            echo "│  📊 Kayıt Sayısı: " . number_format($data['count']) . "\n";
            echo "│  📋 Sütun Sayısı: " . count($data['columns']) . "\n";
            
            if ($data['count'] > 0) {
                echo "│  📝 Sütunlar:\n";
                foreach ($data['columns'] as $col) {
                    $null = $col->Null === 'YES' ? 'NULL' : 'NOT NULL';
                    $key = $col->Key ? " [{$col->Key}]" : '';
                    echo "│     - {$col->Field} ({$col->Type}) {$null}{$key}\n";
                }
                
                if ($data['samples']->count() > 0) {
                    echo "│  🔍 Örnek Kayıtlar:\n";
                    foreach ($data['samples'] as $index => $record) {
                        echo "│     [" . ($index + 1) . "] ";
                        $recordArray = (array) $record;
                        $preview = [];
                        foreach (array_slice($recordArray, 0, 3) as $key => $value) {
                            if (!in_array($key, ['created_at', 'updated_at', 'password'])) {
                                $displayValue = is_string($value) && strlen($value) > 30 
                                    ? substr($value, 0, 30) . '...' 
                                    : $value;
                                $preview[] = "{$key}: {$displayValue}";
                            }
                        }
                        echo implode(', ', $preview) . "\n";
                    }
                }
            } else {
                echo "│  ⚠️  Tablo boş\n";
            }
            echo "└\n\n";
        }
    }
}

// Özet istatistikler
echo "\n" . str_repeat("=", 50) . "\n";
echo "📈 ÖZET İSTATİSTİKLER\n";
echo str_repeat("=", 50) . "\n\n";

$stats = [
    'Tenant Sayısı' => DB::table('tenants')->count(),
    'Kullanıcı Sayısı' => DB::table('users')->count(),
    'Öğrenci Sayısı' => DB::table('students')->count(),
    'Veli Sayısı' => DB::table('guardians')->count(),
    'Kampüs Sayısı' => DB::table('campuses')->count(),
    'Kademe Sayısı' => DB::table('branches')->count(),
    'Eğitim Seviyesi Sayısı' => DB::table('education_levels')->count(),
    'Sınıf Sayısı' => DB::table('classrooms')->count(),
    'Ders Sayısı' => DB::table('lessons')->count(),
    'İl Sayısı' => DB::table('cities')->count(),
    'İlçe Sayısı' => DB::table('districts')->count(),
    'Rol Sayısı' => DB::table('roles')->count(),
    'İzin Sayısı' => DB::table('permissions')->count(),
];

foreach ($stats as $label => $count) {
    echo "  {$label}: " . number_format($count) . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "✅ Rapor tamamlandı!\n";
echo str_repeat("=", 50) . "\n";
