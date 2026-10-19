<?php

namespace App\Actions;

use App\Jobs\SendSmsJob;
use App\Models\Attendance;
use App\Models\Student;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkCreateAttendanceAction
{
    protected ActivityLogService $activityLogService;

    public function __construct(ActivityLogService $activityLogService)
    {
        $this->activityLogService = $activityLogService;
    }

    /**
     * Execute the action to create multiple attendance records.
     *
     * @param  array  $bulkData
     * @return array  ['created' => int, 'attendances' => Collection]
     * @throws \Exception
     */
    public function execute(array $bulkData): array
    {
        return DB::transaction(function () use ($bulkData) {
            $createdAttendances = [];
            $absentStudents = [];

            foreach ($bulkData['attendances'] as $attendanceData) {
                $attendance = Attendance::updateOrCreate(
                    [
                        'tenant_id' => Auth::user()->tenant_id,
                        'student_id' => $attendanceData['student_id'],
                        'schedule_id' => $bulkData['schedule_id'] ?? null,
                        'date' => $bulkData['date'],
                    ],
                    [
                        'teacher_id' => Auth::id(),
                        'status' => $attendanceData['status'],
                        'notes' => $attendanceData['notes'] ?? null,
                    ]
                );

                $createdAttendances[] = $attendance;

                // Devamsızlık durumunda öğrenciyi kaydet
                if ($attendance->status === 'absent') {
                    $absentStudents[] = $attendance;
                }
            }

            // Devamsız öğrenciler için toplu SMS gönder
            if (!empty($absentStudents)) {
                $this->sendBulkAbsenceSms($absentStudents, $bulkData['date']);
                $this->checkAndSendConsecutiveAbsenceNotification($absentStudents, $bulkData['date']);
            }

            // İlişkileri yükle
            foreach ($createdAttendances as $attendance) {
                $attendance->load(['student', 'schedule' => function ($q) {
                    $q->with('lesson');
                }, 'teacher']);
            }

            return [
                'created' => count($createdAttendances),
                'attendances' => collect($createdAttendances),
            ];
        });
    }

    /**
     * Send bulk SMS to guardians for absent students.
     *
     * @param  array  $absentAttendances
     * @param  string  $date
     * @return void
     */
    protected function sendBulkAbsenceSms(array $absentAttendances, string $date): void
    {
        $tenantId = Auth::user()->tenant_id;
        $smsMessages = [];

        foreach ($absentAttendances as $attendance) {
            $student = $attendance->student()->with('guardians')->first();
            $guardians = $student->guardians;

            if ($guardians->isEmpty()) {
                continue;
            }

            $lessonName = $attendance->schedule?->lesson?->name ?? 'Ders';
            $message = "Sayın Veli, {$student->name} öğrencimiz {$date} tarihinde {$lessonName} dersinde devamsızdır.";

            // Her veliye ayrı SMS gönder
            foreach ($guardians as $guardian) {
                if ($guardian->phone) {
                    SendSmsJob::dispatch($guardian->phone, $message, $tenantId);
                }
            }
        }
    }

    /**
     * Günün hem 1. hem de 2. dersine katılmamış öğrenciler için velilere anlık push bildirimi gönderir.
     */
    protected function checkAndSendConsecutiveAbsenceNotification(array $absentAttendances, string $date): void
    {
        try {
            $studentIds = collect($absentAttendances)->pluck('student_id')->unique()->toArray();
            if (empty($studentIds)) {
                return;
            }

            $fcm = app(\App\Services\FcmService::class);

            foreach ($studentIds as $studentId) {
                // Bugün bu öğrenci için ardışık devamsızlık bildirimi daha önce gönderilmiş mi?
                $alreadyNotified = DB::table('notifications')
                    ->where('notifiable_type', Student::class)
                    ->where('notifiable_id', $studentId)
                    ->where('type', 'attendance_absent_consecutive')
                    ->whereDate('created_at', $date)
                    ->exists();

                if ($alreadyNotified) {
                    continue;
                }

                // Öğrencinin bugünkü tüm yoklama kayıtlarını ders başlama saatine göre sıralayarak al
                $dayAttendances = Attendance::where('student_id', $studentId)
                    ->where('date', $date)
                    ->with('schedule')
                    ->get()
                    ->sortBy(function ($att) {
                        return $att->schedule?->start_time ?? '00:00:00';
                    })
                    ->values();

                // En az 2 ders yoklaması alınmış olmalı
                if ($dayAttendances->count() >= 2) {
                    $firstLesson = $dayAttendances[0];
                    $secondLesson = $dayAttendances[1];

                    // Hem 1. ders hem de 2. ders 'absent' ise
                    if ($firstLesson->status === 'absent' && $secondLesson->status === 'absent') {
                        $student = Student::find($studentId);
                        if ($student) {
                            $title = 'Devamsızlık Uyarısı';
                            $body = "Öğrenciniz {$student->name} bugün 1. ve 2. ders saatlerine katılmamıştır.";

                            $fcm->sendToStudent(
                                (int) $studentId,
                                $title,
                                $body,
                                [
                                    'type' => 'attendance_absent_consecutive',
                                    'studentId' => (string) $studentId,
                                ]
                            );
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Ardışık devamsızlık push bildirimi hatası: ' . $e->getMessage());
        }
    }
}
