<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneMask implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) {
            return;
        }

        // Sadece rakamları al
        $phone = preg_replace('/\D/', '', $value);

        // 11 haneli ve 05 ile başlamalı
        if (strlen($phone) !== 11 || !str_starts_with($phone, '05')) {
            $fail('The :attribute must be a valid Turkish phone number (05XXXXXXXXX).');
        }
    }
}
