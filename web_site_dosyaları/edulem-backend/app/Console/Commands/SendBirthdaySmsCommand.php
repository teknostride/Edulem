<?php

namespace App\Console\Commands;

use App\Jobs\SendBirthdaySmsJob;
use Illuminate\Console\Command;

class SendBirthdaySmsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sms:send-birthdays {--tenant= : Specific tenant ID} {--force : Force send immediately regardless of time}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatik doğum günü SMS kontrolünü ve gönderimini çalıştırır';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantId = $this->option('tenant') ? (int) $this->option('tenant') : null;
        $force = (bool) $this->option('force');

        $this->info("Doğum günü SMS kontrolü başlatılıyor... (Tenant: " . ($tenantId ?: 'Tümü') . ", Force: " . ($force ? 'Evet' : 'Hayır') . ")");

        $job = new SendBirthdaySmsJob($tenantId, $force);
        $job->handle();

        $this->info("Doğum günü SMS kontrolü başarıyla tamamlandı.");

        return 0;
    }
}
