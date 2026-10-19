<?php

namespace App\Helpers;

class TcKimlikNoGenerator
{
    /**
     * Generate a valid Turkish ID number for testing purposes.
     * 
     * @return string
     */
    public static function generate(): string
    {
        // İlk 9 haneyi rastgele oluştur (ilk hane 0 olamaz)
        $digits = [];
        $digits[0] = rand(1, 9); // İlk hane 0 olamaz
        
        for ($i = 1; $i < 9; $i++) {
            $digits[$i] = rand(0, 9);
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
            $digits[1] = ($digits[0] + 1) % 10;
        }
        
        // 10. haneyi hesapla
        $sum1 = $digits[0] + $digits[2] + $digits[4] + $digits[6] + $digits[8];
        $sum2 = $digits[1] + $digits[3] + $digits[5] + $digits[7];
        $check1 = ($sum1 * 7 - $sum2) % 10;
        
        if ($check1 < 0) {
            $check1 += 10;
        }
        
        $digits[9] = $check1;
        
        // 11. haneyi hesapla
        $sumAll = array_sum(array_slice($digits, 0, 10));
        $check2 = $sumAll % 10;
        
        $digits[10] = $check2;
        
        return implode('', $digits);
    }
}
