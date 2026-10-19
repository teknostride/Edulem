<?php

namespace Database\Factories;

use App\Models\Student;
use App\Rules\ValidTcKimlikNo;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentFactory extends Factory
{
    protected $model = Student::class;

    private function generateValidTcNo(): string
    {
        $validator = new ValidTcKimlikNo();

        do {
            $firstDigit = random_int(1, 9);
            $digits = [$firstDigit];

            for ($i = 1; $i < 9; $i++) {
                $digits[] = random_int(0, 9);
            }

            $sumOdd = $digits[0] + $digits[2] + $digits[4] + $digits[6] + $digits[8];
            $sumEven = $digits[1] + $digits[3] + $digits[5] + $digits[7];
            $check1 = ($sumOdd * 7 - $sumEven) % 10;
            if ($check1 < 0) {
                $check1 += 10;
            }
            $digits[] = $check1;

            $sumAll = array_sum(array_slice($digits, 0, 10));
            $check2 = $sumAll % 10;
            $digits[] = $check2;

            $tcNo = implode('', $digits);
            if ($validator->isValidTcKimlikNo($tcNo)) {
                return $tcNo;
            }
        } while (true);
    }

    public function definition(): array
    {
        static $trFaker = null;
        if ($trFaker === null) {
            $trFaker = \Faker\Factory::create('tr_TR');
            $trFaker->unique(true);
        }

        $gender = $trFaker->randomElement(['male', 'female']);
        $firstName = $gender === 'male' ? $trFaker->firstNameMale : $trFaker->firstNameFemale;
        $lastName = $trFaker->lastName;
        $fullName = trim($firstName . ' ' . $lastName);

        $digits = preg_replace('/\D+/', '', (string) $trFaker->phoneNumber);
        $digits = ltrim($digits ?? '', '0');
        $phone = $digits ? ('+' . $digits) : null;

        $emailLocal = Str::slug($fullName, '.');
        $email = $emailLocal ? ($emailLocal . '+' . $trFaker->unique()->numerify('####') . '@demo.local') : null;

        return [
            'tenant_id' => null,
            'tc_no' => $this->generateValidTcNo(),
            'school_no' => (string) $trFaker->unique()->numerify('####'),
            'name' => $fullName,
            'birth_date' => $trFaker->dateTimeBetween('-18 years', '-6 years')->format('Y-m-d'),
            'gender' => $gender,
            'is_active' => true,
            'phone' => $phone,
            'email' => $email,
            'address' => $trFaker->address,
            'city_id' => null,
            'district_id' => null,
            'classroom_id' => null,
            'emergency_contact_info' => [
                'name' => trim(($trFaker->firstNameFemale ?? '') . ' ' . ($trFaker->lastName ?? '')),
                'relation' => $trFaker->randomElement(['anne', 'baba', 'veli']),
                'phone' => $trFaker->phoneNumber,
            ],
        ];
    }
}
