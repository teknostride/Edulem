-- Derslere öğretmen atama SQL örnekleri
-- Önce ders ID'lerini ve öğretmen ID'lerini kontrol edin, sonra bu değerleri güncelleyin

-- Tüm dersleri görüntüle
-- SELECT id, name FROM lessons;

-- Tüm kullanıcıları görüntüle (öğretmen olanlar)
-- SELECT id, first_name, last_name FROM users;

-- Örnek: Türkçe dersine öğretmen atama (ID'leri kendi veritabanınıza göre güncelleyin)
-- INSERT INTO lesson_teacher (lesson_id, teacher_id, tenant_id, created_at, updated_at) 
-- VALUES (1, 5, 1, NOW(), NOW());

-- Veya tüm derslere aynı öğretmeni atama (test için)
-- INSERT INTO lesson_teacher (lesson_id, teacher_id, tenant_id, created_at, updated_at)
-- SELECT id, 1, 1, NOW(), NOW() FROM lessons;
