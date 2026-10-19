<?php

namespace Database\Seeders;

use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FixStudentAddressTurkishCharsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        echo "🔧 Öğrenci adreslerindeki Türkçe karakter sorunları düzeltiliyor...\n\n";

        $students = Student::all();
        $fixedCount = 0;

        foreach ($students as $student) {
            if (empty($student->address)) {
                continue;
            }

            $originalAddress = $student->address;
            $fixedAddress = $this->fixTurkishChars($originalAddress);

            if ($originalAddress !== $fixedAddress) {
                $student->address = $fixedAddress;
                $student->save();
                $fixedCount++;
                echo "  ✅ ID: {$student->id} - {$student->name}\n";
                echo "     Eski: {$originalAddress}\n";
                echo "     Yeni: {$fixedAddress}\n\n";
            }
        }

        echo "🎉 Toplam {$fixedCount} öğrenci adresi düzeltildi!\n";
    }

    /**
     * Türkçe karakterleri düzelt
     */
    private function fixTurkishChars(string $text): string
    {
        // Türkçe karakter dönüşüm tablosu
        $replacements = [
            // Küçük harfler
            'ı' => 'ı',
            'ğ' => 'ğ',
            'ü' => 'ü',
            'ş' => 'ş',
            'ö' => 'ö',
            'ç' => 'ç',
            // Büyük harfler
            'İ' => 'İ',
            'Ğ' => 'Ğ',
            'Ü' => 'Ü',
            'Ş' => 'Ş',
            'Ö' => 'Ö',
            'Ç' => 'Ç',
        ];

        // Eğer veritabanında yanlış encoding varsa düzelt
        // Örneğin: 'Ä±' yerine 'ı', 'ÄŸ' yerine 'ğ' gibi
        $encodingFixes = [
            'Ä±' => 'ı',
            'ÄŸ' => 'ğ',
            'Ã¼' => 'ü',
            'ÅŸ' => 'ş',
            'Ã¶' => 'ö',
            'Ã§' => 'ç',
            'Ä°' => 'İ',
            'Äž' => 'Ğ',
            'Ãœ' => 'Ü',
            'Åž' => 'Ş',
            'Ã–' => 'Ö',
            'Ã‡' => 'Ç',
            // Diğer yaygın encoding sorunları
            'Ã½' => 'ı',
            'Ä±' => 'ı',
            'ÄŸ' => 'ğ',
        ];

        // Önce encoding sorunlarını düzelt
        $text = str_replace(array_keys($encodingFixes), array_values($encodingFixes), $text);

        // UTF-8 encoding kontrolü
        if (!mb_check_encoding($text, 'UTF-8')) {
            // Eğer UTF-8 değilse, ISO-8859-9'dan UTF-8'e çevir
            $text = mb_convert_encoding($text, 'UTF-8', 'ISO-8859-9');
        }

        return $text;
    }
}
