<?php

namespace App\Jobs;

use App\Models\Attendance;
use App\Models\Schedule;
use App\Services\FcmService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RemindUnrecordedAttendanceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $now = Carbon::now();
            $dayOfWeek = strtolower($now->format('l')); // monday, tuesday...
            $todayDate = $now->format('Y-m-d');
            $currentTime = $now->format('H:i:s');

            // Şu an devam eden ve bitimine 15 dakikadan az kalan dersleri bul
            // Başlama saati geçmiş ve bitiş saati gelmemiş olan dersler
            $activeSchedules = Schedule::where('day_of_week', $dayOfWeek)
                ->where('start_time', '<=', $currentTime)
                ->where('end_time', '>=', $currentTime)
                ->with(['classroom', 'lesson', 'teacher'])
                ->get();

            if ($activeSchedules->isEmpty()) {
                return;
            }

            $fcm = app(FcmService::class);

            foreach ($activeSchedules as $schedule) {
                if (!$schedule->teacher_id) {
                    continue;
                }

                $endTime = Carbon::parse($schedule->end_time);
                $minutesRemaining = $now->diffInMinutes($endTime, false);

                // Dersin bitimine 15 dakikadan az kaldıysa veya ders ortasını geçtiyse
                if ($minutesRemaining > 15) {
                    continue;
                }

                // Bu ders için bugün yoklama alınmış mı?
                $hasAttendance = Attendance::where('schedule_id', $schedule->id)
                    ->where('date', $todayDate)
                    ->exists();

                if ($hasAttendance) {
                    continue;
                }

                // Bugün bu ders için öğretmene zaten hatırlatma gönderilmiş mi?
                $alreadyReminded = DB::table('notifications')
                    ->where('notifiable_id', $schedule->teacher_id)
                    ->where('type', 'attendance_reminder')
                    ->whereDate('created_at', $todayDate)
                    ->where('data', 'like', '%"scheduleId":' . $schedule->id . '%')
                    ->exists();

                if ($alreadyReminded) {
                    continue;
                }

                $classroomName = $schedule->classroom?->name ?? 'Sınıf';
                $lessonName = $schedule->lesson?->name ?? 'Ders';

                $title = "Yoklama Hatırlatması";
                $body = "{$classroomName} - {$lessonName} dersinizin yoklaması henüz alınmadı. Lütfen yoklamayı tamamlayınız.";

                $fcm->sendToUser(
                    (int) $schedule->teacher_id,
                    $title,
                    $body,
                    [
                        'type' => 'attendance_reminder',
                        'scheduleId' => $schedule->id,
                        'classroomId' => $schedule->classroom_id,
                        'route' => '/attendance',
                    ]
                );

                Log::info("Öğretmene yoklama hatırlatıldı: Teacher={$schedule->teacher_id}, Schedule={$schedule->id}");
            }
        } catch (\Throwable $e) {
            Log::error('RemindUnrecordedAttendanceJob hata: ' . $e->getMessage());
        }
    }
}
