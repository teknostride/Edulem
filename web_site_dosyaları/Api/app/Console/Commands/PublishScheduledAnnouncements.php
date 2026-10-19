<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use Illuminate\Console\Command;

class PublishScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:publish-scheduled';

    protected $description = 'Zamanı gelen planlanmış duyuruları (scheduled_at <= now) yayınlanmış (published) yapar.';

    public function handle(): int
    {
        $n = Announcement::where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->update(['status' => 'published']);

        if ($n > 0) {
            $this->info("{$n} planlanmış duyuru yayınlandı.");
        }

        return Command::SUCCESS;
    }
}
