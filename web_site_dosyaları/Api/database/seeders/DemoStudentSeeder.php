<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\Classroom;
use App\Models\City;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoStudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tüm aktif sınıfları al
        $classrooms = Classroom::where('is_active', true)->get();

        if ($classrooms->isEmpty()) {
            echo "❌ Aktif sınıf bulunamadı!\n";
            return;
        }

        // İlk şehri al (varsayılan olarak)
        $city = City::first();
        if (!$city) {
            echo "❌ Şehir bulunamadı! Önce şehir verilerini ekleyin.\n";
            return;
        }

        // Türkçe isim ve soyisim listeleri
        $firstNames = [
            'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'İsmail', 'Osman', 'Yusuf',
            'Ayşe', 'Fatma', 'Zeynep', 'Emine', 'Hatice', 'Elif', 'Merve', 'Selin', 'Büşra', 'Derya',
            'Can', 'Burak', 'Emre', 'Kerem', 'Arda', 'Ege', 'Deniz', 'Kaan', 'Berk', 'Onur',
            'Selin', 'Zeynep', 'Elif', 'Merve', 'Büşra', 'Derya', 'Ceren', 'Gizem', 'Seda', 'Pınar'
        ];

        $lastNames = [
            'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
            'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
            'Polat', 'Erdoğan', 'Ateş', 'Güneş', 'Bulut', 'Taş', 'Toprak', 'Çakır', 'Köse', 'Türk'
        ];

        $totalCreated = 0;

        foreach ($classrooms as $classroom) {
            $tenantId = $classroom->tenant_id;
            
            // Bu sınıfta zaten öğrenci var mı kontrol et
            $existingCount = Student::where('classroom_id', $classroom->id)->count();
            
            if ($existingCount >= 5) {
                echo "⏭️  {$classroom->name} sınıfında zaten {$existingCount} öğrenci var, atlanıyor...\n";
                continue;
            }

            $studentsToCreate = 5 - $existingCount;
            echo "📚 {$classroom->name} sınıfına {$studentsToCreate} öğrenci ekleniyor...\n";

            for ($i = 0; $i < $studentsToCreate; $i++) {
                // Rastgele isim seç
                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                $studentName = $firstName . ' ' . $lastName;

                // Rastgele cinsiyet
                $gender = (rand(0, 1) === 0) ? 'male' : 'female';

                // Rastgele doğum tarihi (2005-2015 arası)
                $birthYear = rand(2005, 2015);
                $birthMonth = rand(1, 12);
                $birthDay = rand(1, 28);
                $birthDate = Carbon::create($birthYear, $birthMonth, $birthDay);

                // Geçerli TC Kimlik No oluştur (11 haneli, ilk hane 0 olamaz)
                $tcNo = $this->generateValidTcNo();

                // Okul numarası (1000-9999 arası)
                $schoolNo = (string)rand(1000, 9999);

                // Telefon numarası (5XX XXX XX XX formatında)
                $phone = '5' . rand(10, 99) . ' ' . rand(100, 999) . ' ' . rand(10, 99) . ' ' . rand(10, 99);

                // E-posta
                $email = strtolower($firstName . '.' . $lastName . '@demo.com');
                $email = str_replace('ı', 'i', $email);
                $email = str_replace('ğ', 'g', $email);
                $email = str_replace('ü', 'u', $email);
                $email = str_replace('ş', 's', $email);
                $email = str_replace('ö', 'o', $email);
                $email = str_replace('ç', 'c', $email);
                $email = str_replace('İ', 'i', $email);
                $email = str_replace('Ğ', 'g', $email);
                $email = str_replace('Ü', 'u', $email);
                $email = str_replace('Ş', 's', $email);
                $email = str_replace('Ö', 'o', $email);
                $email = str_replace('Ç', 'c', $email);

                // Adres
                $addresses = [
                    'Atatürk Mahallesi, Cumhuriyet Caddesi No:' . rand(1, 200),
                    'Yeni Mahalle, İnönü Sokak No:' . rand(1, 150),
                    'Merkez Mahalle, Gazi Bulvarı No:' . rand(1, 300),
                    'Bahçelievler, Mevlana Caddesi No:' . rand(1, 250),
                    'Kızılay, İstiklal Sokak No:' . rand(1, 180)
                ];
                $address = $addresses[array_rand($addresses)] . ', ' . $city->name;

                // Öğrenci oluştur
                try {
                    Student::create([
                        'tenant_id' => $tenantId,
                        'student_name' => $studentName,
                        'tc_no' => $tcNo,
                        'school_no' => $schoolNo,
                        'birth_date' => $birthDate->format('Y-m-d'),
                        'gender' => $gender,
                        'phone' => $phone,
                        'email' => $email,
                        'address' => $address,
                        'city_id' => $city->id,
                        'district_id' => null, // İsteğe bağlı
                        'classroom_id' => $classroom->id,
                        'is_active' => true,
                    ]);

                    $totalCreated++;
                    echo "  ✅ {$studentName} eklendi\n";
                } catch (\Exception $e) {
                    echo "  ❌ {$studentName} eklenirken hata: " . $e->getMessage() . "\n";
                }
            }
        }

        echo "\n🎉 Toplam {$totalCreated} demo öğrenci eklendi!\n";
    }

    /**
     * Geçerli bir TC Kimlik No oluştur (TC standartlarına uygun)
     * Not: Bu sadece demo amaçlıdır, gerçek TC kimlik numaraları kullanılmamalıdır.
     */
    private function generateValidTcNo(): string
    {
        do {
            // İlk hane 0 olamaz
            $firstDigit = rand(1, 9);
            
            // İlk 9 haneyi oluştur
            $digits = [$firstDigit];
            for ($i = 1; $i < 9; $i++) {
                $digits[] = rand(0, 9);
            }
            
            // Tüm rakamlar aynı olamaz kontrolü
            $allSame = true;
            for ($i = 1; $i < 9; $i++) {
                if ($digits[$i] !== $digits[0]) {
                    $allSame = false;
                    break;
                }
            }
            
            if ($allSame) {
                continue; // Yeniden oluştur
            }
            
            // 10. hane: (Tek sıradaki rakamların toplamı * 7 - Çift sıradaki rakamların toplamı) mod 10
            $sumOdd = $digits[0] + $digits[2] + $digits[4] + $digits[6] + $digits[8];
            $sumEven = $digits[1] + $digits[3] + $digits[5] + $digits[7];
            $check1 = ($sumOdd * 7 - $sumEven) % 10;
            
            if ($check1 < 0) {
                $check1 += 10;
            }
            
            $digits[] = $check1;
            
            // 11. hane: İlk 10 hanenin toplamının mod 10'u
            $sumAll = array_sum(array_slice($digits, 0, 10));
            $check2 = $sumAll % 10;
            $digits[] = $check2;
            
            $tcNo = implode('', $digits);
            
            // ValidTcKimlikNo rule'ı ile doğrula
            $validator = new \App\Rules\ValidTcKimlikNo();
            if ($validator->isValidTcKimlikNo($tcNo)) {
                return $tcNo;
            }
            
        } while (true); // Geçerli bir TC No bulana kadar dene
    }
}
