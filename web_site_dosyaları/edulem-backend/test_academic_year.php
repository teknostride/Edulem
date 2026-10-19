<?php

/**
 * AcademicYear Modülü Test Scripti
 * 
 * Bu script AcademicYear API endpoint'lerini test eder.
 * Önce bir kullanıcı ile login olmanız gerekiyor.
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Base URL
$baseUrl = 'http://localhost/api/v1';

// Test için kullanılacak token (login yaparak alınmalı)
$token = 'YOUR_TOKEN_HERE'; // Login yaparak token alın

$headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token,
];

/**
 * API isteği gönder
 */
function makeRequest($url, $method = 'GET', $data = null) {
    global $headers;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'code' => $httpCode,
        'data' => json_decode($response, true),
    ];
}

echo "=== AcademicYear Modülü Test Scripti ===\n\n";

// 1. Liste (GET)
echo "1. AcademicYear Listesi (GET /api/v1/academic-years)\n";
$response = makeRequest($baseUrl . '/academic-years');
echo "HTTP Code: " . $response['code'] . "\n";
echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// 2. Oluştur (POST)
echo "2. AcademicYear Oluştur (POST /api/v1/academic-years)\n";
$createData = [
    'name' => '2024-2025 Eğitim Öğretim Yılı',
    'code' => '2024-2025',
    'start_date' => '2024-09-01',
    'end_date' => '2025-06-30',
    'is_active' => true,
    'description' => 'Test öğretim yılı',
];
$response = makeRequest($baseUrl . '/academic-years', 'POST', $createData);
echo "HTTP Code: " . $response['code'] . "\n";
echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

$academicYearId = $response['data']['data']['id'] ?? null;

if ($academicYearId) {
    // 3. Detay (GET)
    echo "3. AcademicYear Detay (GET /api/v1/academic-years/{$academicYearId})\n";
    $response = makeRequest($baseUrl . '/academic-years/' . $academicYearId);
    echo "HTTP Code: " . $response['code'] . "\n";
    echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // 4. İstatistikler (GET)
    echo "4. AcademicYear İstatistikler (GET /api/v1/academic-years/{$academicYearId}/statistics)\n";
    $response = makeRequest($baseUrl . '/academic-years/' . $academicYearId . '/statistics');
    echo "HTTP Code: " . $response['code'] . "\n";
    echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // 5. Güncelle (PUT)
    echo "5. AcademicYear Güncelle (PUT /api/v1/academic-years/{$academicYearId})\n";
    $updateData = [
        'name' => '2024-2025 Eğitim Öğretim Yılı (Güncellendi)',
        'description' => 'Güncellenmiş test öğretim yılı',
    ];
    $response = makeRequest($baseUrl . '/academic-years/' . $academicYearId, 'PUT', $updateData);
    echo "HTTP Code: " . $response['code'] . "\n";
    echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // 6. Aktif Sezon Filtresi (GET)
    echo "6. Aktif Sezonlar (GET /api/v1/academic-years?active_only=true)\n";
    $response = makeRequest($baseUrl . '/academic-years?active_only=true');
    echo "HTTP Code: " . $response['code'] . "\n";
    echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // 7. Tarih Bazlı Filtre (GET)
    echo "7. Tarih Bazlı Filtre (GET /api/v1/academic-years?date=2024-10-15)\n";
    $response = makeRequest($baseUrl . '/academic-years?date=2024-10-15');
    echo "HTTP Code: " . $response['code'] . "\n";
    echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    
    // 8. Sil (DELETE) - Son adım, yorum satırına alındı
    // echo "8. AcademicYear Sil (DELETE /api/v1/academic-years/{$academicYearId})\n";
    // $response = makeRequest($baseUrl . '/academic-years/' . $academicYearId, 'DELETE');
    // echo "HTTP Code: " . $response['code'] . "\n";
    // echo "Response: " . json_encode($response['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
}

echo "=== Test Tamamlandı ===\n";
