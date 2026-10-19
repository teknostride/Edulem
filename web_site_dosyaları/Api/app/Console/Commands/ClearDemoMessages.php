<?php

namespace App\Console\Commands;

use App\Models\Message;
use Illuminate\Console\Command;

class ClearDemoMessages extends Command
{
    protected $signature = 'messages:clear-demo {--force : Onay istemeden sil}';

    protected $description = 'messages tablosundaki tüm kayıtları (demo/test verileri) siler.';

    public function handle(): int
    {
        $count = Message::query()->count();
        if ($count === 0) {
            $this->info('Zaten mesaj kaydı yok.');
            return Command::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm("{$count} mesaj silinecek. Emin misiniz?")) {
            return Command::SUCCESS;
        }

        Message::query()->delete();
        $this->info("{$count} mesaj silindi.");

        return Command::SUCCESS;
    }
}
