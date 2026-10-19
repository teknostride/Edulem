<?php

use App\Jobs\SendFirstLessonAbsenceSmsJob;
use App\Jobs\ProcessScheduledSmsJob;
use App\Jobs\SendBirthdaySmsJob;
use App\Jobs\SendWeddingAnniversarySmsJob;
use App\Jobs\SendDailyAbsenceReportSmsJob;
use App\Jobs\SendDailyHomeworkReminderSmsJob;
use App\Jobs\SendPaymentReminderSmsJob;
use App\Jobs\SendSmsCreditAlertJob;
use App\Jobs\SendTutoringSessionReminderSmsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Günün ilk dersi gelmeyen öğrenci SMS (Her gün 09:00'da)
Schedule::job(new SendFirstLessonAbsenceSmsJob)
    ->dailyAt('09:00')
    ->name('send-first-lesson-absence-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Planlı SMS işleme (Her 5 dakikada bir)
Schedule::job(new ProcessScheduledSmsJob)
    ->everyFiveMinutes()
    ->name('process-scheduled-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Doğum günü kutlama SMS (Her 10 dakikada bir kontrol eder, kurumun belirlediği saatte otomatik gönderir)
Schedule::job(new SendBirthdaySmsJob)
    ->everyTenMinutes()
    ->name('send-birthday-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Evlilik yıldönümü kutlama SMS (Her gün 08:00'da)
Schedule::job(new SendWeddingAnniversarySmsJob)
    ->dailyAt('08:00')
    ->name('send-wedding-anniversary-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Günlük devamsızlık raporu SMS (Her gün 18:00'da)
Schedule::job(new SendDailyAbsenceReportSmsJob)
    ->dailyAt('18:00')
    ->name('send-daily-absence-report-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Günlük ödev hatırlatma SMS (Her gün 17:00'da)
Schedule::job(new SendDailyHomeworkReminderSmsJob)
    ->dailyAt('17:00')
    ->name('send-daily-homework-reminder-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Ödeme hatırlatma SMS (Her gün 10:00'da)
Schedule::job(new SendPaymentReminderSmsJob)
    ->dailyAt('10:00')
    ->name('send-payment-reminder-sms')
    ->withoutOverlapping()
    ->onOneServer();

// SMS kontörü kritik uyarısı (Her gün 09:00'da)
Schedule::job(new SendSmsCreditAlertJob)
    ->dailyAt('09:00')
    ->name('send-sms-credit-alert')
    ->withoutOverlapping()
    ->onOneServer();

// Etüt hatırlatma SMS (Her gün 18:00'da - yarınki etütler için)
Schedule::job(new SendTutoringSessionReminderSmsJob)
    ->dailyAt('18:00')
    ->name('send-tutoring-session-reminder-sms')
    ->withoutOverlapping()
    ->onOneServer();

// Otomatik süresi dolan online sınavları gönder (Her dakika)
Schedule::call(function () {
    $service = app(\App\Services\OnlineExamService::class);
    $service->autoSubmitExpiredAttempts();
})->everyMinute()
    ->name('auto-submit-expired-online-exams')
    ->withoutOverlapping()
    ->onOneServer();

// Planlanmış duyuruları zamanı gelince yayınla (Her dakika; cron yoksa index/unread-count'ta da çalışır)
Schedule::command('announcements:publish-scheduled')
    ->everyMinute()
    ->name('publish-scheduled-announcements')
    ->withoutOverlapping()
    ->onOneServer();

// Öğretmene Yoklama Hatırlatma Push Bildirimi (Her 5 dakikada bir, bitimine az kalan dersler için)
Schedule::job(new \App\Jobs\RemindUnrecordedAttendanceJob)
    ->everyFiveMinutes()
    ->name('remind-unrecorded-attendance-push')
    ->withoutOverlapping()
    ->onOneServer();

// Öğretmen Sabah Nöbet Hatırlatma Push Bildirimi (Her sabah 07:45'te)
Schedule::job(new \App\Jobs\RemindDutyScheduleJob)
    ->dailyAt('07:45')
    ->name('remind-duty-schedule-push')
    ->withoutOverlapping()
    ->onOneServer();
