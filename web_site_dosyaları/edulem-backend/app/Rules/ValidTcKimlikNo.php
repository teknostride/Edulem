<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidTcKimlikNo implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!$this->isValidTcKimlikNo($value)) {
            $fail(':attribute geçerli bir TC Kimlik No değil.');
        }
    }

    /**
     * Validate Turkish ID number (TC Kimlik No) algorithm.
     *
     * @param  string|null  $tcNo
     * @return bool
     */
    public function isValidTcKimlikNo(?string $tcNo): bool
    {
        if (empty($tcNo) || strlen($tcNo) !== 11) {
            return false;
        }

        // Tüm rakamlar aynı olamaz (11111111111 gibi)
        if (preg_match('/^(\d)\1{10}$/', $tcNo)) {
            return false;
        }

        // İlk rakam 0 olamaz
        if ($tcNo[0] === '0') {
            return false;
        }

        $digits = str_split($tcNo);
        $digits = array_map('intval', $digits);

        // 10. hanenin kontrolü
        $sum1 = $digits[0] + $digits[2] + $digits[4] + $digits[6] + $digits[8];
        $sum2 = $digits[1] + $digits[3] + $digits[5] + $digits[7];
        $check1 = ($sum1 * 7 - $sum2) % 10;
        
        if ($check1 < 0) {
            $check1 += 10;
        }

        if ($check1 !== $digits[9]) {
            return false;
        }

        // 11. hanenin kontrolü
        $sumAll = array_sum(array_slice($digits, 0, 10));
        $check2 = $sumAll % 10;

        if ($check2 !== $digits[10]) {
            return false;
        }

        return true;
    }
}
