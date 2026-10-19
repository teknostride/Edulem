<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Student;
use App\Rules\ValidTcKimlikNo;
use Illuminate\Database\Seeder;

class DemoStudentsForClassroomsSeeder extends Seeder
{
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

    private function generateUniqueTcNo(): string
    {
        do {
            $tcNo = $this->generateValidTcNo();
        } while (Student::where('tc_no', $tcNo)->exists());

        return $tcNo;
    }

    private function nextSchoolNoForTenant(int $tenantId, int $offset): string
    {
        $maxExisting = Student::where('tenant_id', $tenantId)
            ->whereNotNull('school_no')
            ->max('school_no');

        $base = is_numeric($maxExisting) ? (int) $maxExisting : 0;
        $next = $base + $offset;

        return (string) $next;
    }

    public function run(): void
    {
        $classrooms = Classroom::query()->get();

        if ($classrooms->isEmpty()) {
            $this->command?->warn('Sınıf bulunamadı.');
            return;
        }

        $totalCreated = 0;

        foreach ($classrooms as $classroom) {
            $tenantId = (int) $classroom->tenant_id;

            $existingCount = Student::where('classroom_id', $classroom->id)->count();
            $toCreate = max(0, 10 - $existingCount);

            if ($toCreate === 0) {
                continue;
            }

            $this->command?->info("{$classroom->name} (#{$classroom->id}) -> {$toCreate} demo öğrenci ekleniyor...");

            for ($i = 1; $i <= $toCreate; $i++) {
                $schoolNo = $this->nextSchoolNoForTenant($tenantId, $i);

                while (Student::where('tenant_id', $tenantId)->where('school_no', $schoolNo)->exists()) {
                    $schoolNo = (string) ((int) $schoolNo + 1);
                }

                Student::factory()
                    ->state([
                        'tenant_id' => $tenantId,
                        'classroom_id' => $classroom->id,
                        'school_no' => $schoolNo,
                        'tc_no' => $this->generateUniqueTcNo(),
                    ])
                    ->create();

                $totalCreated++;
            }
        }

        $this->command?->info("Toplam {$totalCreated} demo öğrenci oluşturuldu.");
    }
}
