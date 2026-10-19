<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateTcKimlikNo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tckn:generate {count=1}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate valid Turkish ID numbers for testing';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $count = (int) $this->argument('count');
        
        for ($i = 0; $i < $count; $i++) {
            $tckn = $this->generateTcKimlikNo();
            $this->line($tckn);
        }
        
        return Command::SUCCESS;
    }

    /**
     * Generate a valid Turkish ID number.
     */
    protected function generateTcKimlikNo(): string
    {
        // İlk 9 haneyi rastgele oluştur (ilk hane 0 olamaz)
        $digits = [];
        $digits[0] = rand(1, 9);
        
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
