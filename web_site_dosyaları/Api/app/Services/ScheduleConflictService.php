<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\TutoringSession;
use Illuminate\Support\Facades\DB;

class ScheduleConflictService
{
    /**
     * Check for conflicts before creating or updating a schedule.
     *
     * @param  array  $scheduleData
     * @param  int|null  $excludeScheduleId  Schedule ID to exclude from conflict check (for updates)
     * @return array  ['has_conflict' => bool, 'conflicts' => array]
     */
    public function checkConflicts(array $scheduleData, ?int $excludeScheduleId = null): array
    {
        $conflicts = [];

        $teacherId = isset($scheduleData['teacher_id']) ? (int) $scheduleData['teacher_id'] : 0;

        // 1. Öğretmen çakışma kontrolü (öğretmensiz kayıtlar için atlanır)
        if ($teacherId > 0) {
            $teacherConflict = $this->checkTeacherConflict(
                $teacherId,
                $scheduleData['day_of_week'],
                $scheduleData['start_time'],
                $scheduleData['end_time'],
                $excludeScheduleId
            );

            if ($teacherConflict) {
                $conflicts['teacher'] = $teacherConflict;
            }
        }

        // 1.1 Yardımcı öğretmen(ler) çakışma kontrolü
        $assistantTeacherIds = $scheduleData['assistant_teacher_ids'] ?? [];
        if (is_array($assistantTeacherIds) && !empty($assistantTeacherIds)) {
            $assistantTeacherIds = array_values(array_unique(array_filter(array_map('intval', $assistantTeacherIds))));
            $assistantTeacherIds = array_values(array_filter(
                $assistantTeacherIds,
                fn ($id) => $id > 0 && ($teacherId > 0 ? (int) $id !== $teacherId : true)
            ));

            foreach ($assistantTeacherIds as $aid) {
                $conflict = $this->checkTeacherConflict(
                    (int) $aid,
                    $scheduleData['day_of_week'],
                    $scheduleData['start_time'],
                    $scheduleData['end_time'],
                    $excludeScheduleId
                );

                if ($conflict) {
                    $conflict['message'] = "Yardımcı öğretmen aynı gün ve saatte başka bir ders veriyor.";
                    $conflicts['assistant_teacher_' . $aid] = $conflict;
                }
            }
        }

        // 2. Sınıf çakışma kontrolü
        $classroomConflict = $this->checkClassroomConflict(
            $scheduleData['classroom_id'],
            $scheduleData['day_of_week'],
            $scheduleData['start_time'],
            $scheduleData['end_time'],
            $excludeScheduleId
        );

        if ($classroomConflict) {
            $conflicts['classroom'] = $classroomConflict;
        }

        // 3. Derslik (room) çakışma kontrolü (eğer room belirtilmişse)
        if (!empty($scheduleData['room'])) {
            $roomConflict = $this->checkRoomConflict(
                $scheduleData['room'],
                $scheduleData['day_of_week'],
                $scheduleData['start_time'],
                $scheduleData['end_time'],
                $excludeScheduleId
            );

            if ($roomConflict) {
                $conflicts['room'] = $roomConflict;
            }
        }

        return [
            'has_conflict' => !empty($conflicts),
            'conflicts' => $conflicts,
        ];
    }

    /**
     * Check if teacher has a conflict at the same day and time.
     *
     * @param  int  $teacherId
     * @param  string  $dayOfWeek
     * @param  string  $startTime
     * @param  string  $endTime
     * @param  int|null  $excludeScheduleId
     * @return array|null
     */
    protected function checkTeacherConflict(int $teacherId, string $dayOfWeek, string $startTime, string $endTime, ?int $excludeScheduleId = null): ?array
    {
        $query = Schedule::where('teacher_id', $teacherId)
            ->where('day_of_week', $dayOfWeek)
            ->where(function ($q) use ($startTime, $endTime) {
                // Çakışma durumları:
                // 1. Yeni ders başlangıcı mevcut dersin içinde
                // 2. Yeni ders bitişi mevcut dersin içinde
                // 3. Yeni ders mevcut dersi tamamen kapsıyor
                $q->whereBetween('start_time', [$startTime, $endTime])
                    ->orWhereBetween('end_time', [$startTime, $endTime])
                    ->orWhere(function ($subQ) use ($startTime, $endTime) {
                        $subQ->where('start_time', '<=', $startTime)
                            ->where('end_time', '>=', $endTime);
                    });
            });

        if ($excludeScheduleId) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        $conflictingSchedule = $query->with(['classroom', 'lesson'])->first();

        if ($conflictingSchedule) {
            return [
                'message' => "Öğretmen aynı gün ve saatte başka bir ders veriyor.",
                'conflicting_schedule' => [
                    'id' => $conflictingSchedule->id,
                    'classroom' => $conflictingSchedule->classroom->name,
                    'lesson' => $conflictingSchedule->lesson->name,
                    'time' => $conflictingSchedule->start_time . ' - ' . $conflictingSchedule->end_time,
                ],
            ];
        }

        return null;
    }

    /**
     * Check if classroom has a conflict at the same day and time.
     *
     * @param  int  $classroomId
     * @param  string  $dayOfWeek
     * @param  string  $startTime
     * @param  string  $endTime
     * @param  int|null  $excludeScheduleId
     * @return array|null
     */
    protected function checkClassroomConflict(int $classroomId, string $dayOfWeek, string $startTime, string $endTime, ?int $excludeScheduleId = null): ?array
    {
        $query = Schedule::where('classroom_id', $classroomId)
            ->where('day_of_week', $dayOfWeek)
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                    ->orWhereBetween('end_time', [$startTime, $endTime])
                    ->orWhere(function ($subQ) use ($startTime, $endTime) {
                        $subQ->where('start_time', '<=', $startTime)
                            ->where('end_time', '>=', $endTime);
                    });
            });

        if ($excludeScheduleId) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        $conflictingSchedule = $query->with(['lesson', 'teacher'])->first();

        if ($conflictingSchedule) {
            return [
                'message' => "Sınıf aynı gün ve saatte başka bir ders alıyor.",
                'conflicting_schedule' => [
                    'id' => $conflictingSchedule->id,
                    'lesson' => $conflictingSchedule->lesson->name,
                    'teacher' => $conflictingSchedule->teacher->name,
                    'time' => $conflictingSchedule->start_time . ' - ' . $conflictingSchedule->end_time,
                ],
            ];
        }

        return null;
    }

    /**
     * Check if room has a conflict at the same day and time.
     *
     * @param  string  $room
     * @param  string  $dayOfWeek
     * @param  string  $startTime
     * @param  string  $endTime
     * @param  int|null  $excludeScheduleId
     * @return array|null
     */
    protected function checkRoomConflict(string $room, string $dayOfWeek, string $startTime, string $endTime, ?int $excludeScheduleId = null): ?array
    {
        $query = Schedule::where('room', $room)
            ->where('day_of_week', $dayOfWeek)
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                    ->orWhereBetween('end_time', [$startTime, $endTime])
                    ->orWhere(function ($subQ) use ($startTime, $endTime) {
                        $subQ->where('start_time', '<=', $startTime)
                            ->where('end_time', '>=', $endTime);
                    });
            });

        if ($excludeScheduleId) {
            $query->where('id', '!=', $excludeScheduleId);
        }

        $conflictingSchedule = $query->with(['classroom', 'lesson', 'teacher'])->first();

        if ($conflictingSchedule) {
            return [
                'message' => "Derslik aynı gün ve saatte başka bir ders için kullanılıyor.",
                'conflicting_schedule' => [
                    'id' => $conflictingSchedule->id,
                    'classroom' => $conflictingSchedule->classroom->name,
                    'lesson' => $conflictingSchedule->lesson->name,
                    'teacher' => $conflictingSchedule->teacher->name,
                    'time' => $conflictingSchedule->start_time . ' - ' . $conflictingSchedule->end_time,
                ],
            ];
        }

        return null;
    }

    /**
     * Check if teacher has a conflict with tutoring session or schedule.
     *
     * @param  int  $teacherId
     * @param  string  $date
     * @param  string  $startTime
     * @param  string  $endTime
     * @param  int|null  $excludeSessionId
     * @return bool
     */
    public function checkTutoringConflict(int $teacherId, string $date, string $startTime, string $endTime, ?int $excludeSessionId = null): bool
    {
        // Etüt çakışması kontrolü
        $tutoringQuery = TutoringSession::where('teacher_id', $teacherId)
            ->where('date', $date)
            ->where('is_active', true)
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                    ->orWhereBetween('end_time', [$startTime, $endTime])
                    ->orWhere(function ($subQ) use ($startTime, $endTime) {
                        $subQ->where('start_time', '<=', $startTime)
                            ->where('end_time', '>=', $endTime);
                    });
            });

        if ($excludeSessionId) {
            $tutoringQuery->where('id', '!=', $excludeSessionId);
        }

        if ($tutoringQuery->exists()) {
            return true;
        }

        // Ders programı çakışması kontrolü (aynı günün haftanın gününe çevir)
        $dayOfWeek = strtolower(\Carbon\Carbon::parse($date)->format('l'));
        $dayMap = [
            'monday' => 'monday',
            'tuesday' => 'tuesday',
            'wednesday' => 'wednesday',
            'thursday' => 'thursday',
            'friday' => 'friday',
            'saturday' => 'saturday',
            'sunday' => 'sunday',
        ];

        $dayOfWeek = $dayMap[$dayOfWeek] ?? null;

        if ($dayOfWeek) {
            $scheduleQuery = Schedule::where('teacher_id', $teacherId)
                ->where('day_of_week', $dayOfWeek)
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->whereBetween('start_time', [$startTime, $endTime])
                        ->orWhereBetween('end_time', [$startTime, $endTime])
                        ->orWhere(function ($subQ) use ($startTime, $endTime) {
                            $subQ->where('start_time', '<=', $startTime)
                                ->where('end_time', '>=', $endTime);
                        });
                });

            if ($scheduleQuery->exists()) {
                return true;
            }
        }

        return false;
    }
}
