<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Rules\ValidTcKimlikNo;
use Illuminate\Database\Seeder;

class FixStudentTcNoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "🔧 Öğrenci TC kimlik numaraları TC standartlarına göre düzeltiliyor...\n\n";

        $students = Student::all();
        $validator = new ValidTcKimlikNo();
        $fixedCount = 0;
        $skippedCount = 0;

        foreach ($students as $student) {
            if (empty($student->tc_no)) {
                echo "  ⚠️  ID: {$student->id} - {$student->name} - TC No boş, atlanıyor\n";
                $skippedCount++;
                continue;
            }

            // TC No'yu kontrol et
            if ($validator->isValidTcKimlikNo($student->tc_no)) {
                echo "  ✓ ID: {$student->id} - {$student->name} - TC No geçerli: {$student->tc_no}\n";
                continue;
            }

            // Geçersiz TC No'yu düzelt
            $newTcNo = $this->generateValidTcNo();
            
            // Aynı TC No'ya sahip başka öğrenci var mı kontrol et
            $existing = Student::where('tc_no', $newTcNo)
                ->where('id', '!=', $student->id)
                ->first();
            
            if ($existing) {
                // Eğer varsa, yeni bir tane oluştur
                do {
                    $newTcNo = $this->generateValidTcNo();
                    $existing = Student::where('tc_no', $newTcNo)
                        ->where('id', '!=', $student->id)
                        ->first();
                } while ($existing);
            }

            $oldTcNo = $student->tc_no;
            $student->tc_no = $newTcNo;
            $student->save();

            $fixedCount++;
            echo "  ✅ ID: {$student->id} - {$student->name}\n";
            echo "     Eski: {$oldTcNo} (geçersiz)\n";
            echo "     Yeni: {$newTcNo} (geçerli)\n\n";
        }

        echo "🎉 Toplam {$fixedCount} öğrenci TC No düzeltildi!\n";
        if ($skippedCount > 0) {
            echo "⚠️  {$skippedCount} öğrenci TC No'su boş olduğu için atlandı.\n";
        }
    }

    /**
     * Geçerli bir TC Kimlik No oluştur (TC standartlarına uygun)
     */
    private function generateValidTcNo(): string
    {
        $validator = new ValidTcKimlikNo();
        
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
            if ($validator->isValidTcKimlikNo($tcNo)) {
                return $tcNo;
            }
            
        } while (true); // Geçerli bir TC No bulana kadar dene
    }
}
