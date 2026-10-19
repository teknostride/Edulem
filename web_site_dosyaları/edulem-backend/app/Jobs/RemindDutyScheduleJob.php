<?php

namespace App\Jobs;

use App\Models\DutySchedule;
use App\Services\FcmService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RemindDutyScheduleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $now = Carbon::now();
            $dayOfWeek = ucfirst(strtolower($now->format('l'))); // Monday, Tuesday...
            $todayDate = $now->format('Y-m-d');

            $duties = DutySchedule::where('day_of_week', $dayOfWeek)
                ->where('is_active', true)
                ->whereNotNull('user_id')
                ->with('user')
                ->get();

            if ($duties->isEmpty()) {
                return;
            }

            $fcm = app(FcmService::class);

            foreach ($duties as $duty) {
                if (!$duty->user_id) {
                    continue;
                }

                // Bugün bu nöbet için zaten bildirim gönderilmiş mi?
                $alreadyReminded = DB::table('notifications')
                    ->where('notifiable_id', $duty->user_id)
                    ->where('type', 'duty_reminder')
                    ->whereDate('created_at', $todayDate)
                    ->where('data', 'like', '%"dutyId":' . $duty->id . '%')
                    ->exists();

                if ($alreadyReminded) {
                    continue;
                }

                $location = $duty->location ?? 'Okul';
                $timeText = ($duty->start_time && $duty->end_time) ? " ({$duty->start_time} - {$duty->end_time})" : '';

                $title = "Nöbetçi Öğretmen Hatırlatması";
                $body = "Bugün {$location} bölgesinde{$timeText} nöbetçisisiniz. İyi dersler dileriz.";

                $fcm->sendToUser(
                    (int) $duty->user_id,
                    $title,
                    $body,
                    [
                        'type' => 'duty_reminder',
                        'dutyId' => $duty->id,
                        'route' => '/duty-schedule',
                    ]
                );

                Log::info("Öğretmene nöbet hatırlatıldı: Teacher={$duty->user_id}, Location={$location}");
            }
        } catch (\Throwable $e) {
            Log::error('RemindDutyScheduleJob hata: ' . $e->getMessage());
        }
    }
}
