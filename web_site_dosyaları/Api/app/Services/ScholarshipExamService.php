<?php

namespace App\Services;

use App\Models\ScholarshipExam;
use App\Models\ScholarshipExamApplication;
use App\Models\Student;
use App\Models\Lead;
use App\Models\Classroom;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScholarshipExamService
{
    /**
     * Process application and assign classroom.
     *
     * @param ScholarshipExamApplication $application
     * @return ScholarshipExamApplication
     * @throws \Exception
     */
    public function processApplication(ScholarshipExamApplication $application): ScholarshipExamApplication
    {
        return DB::transaction(function () use ($application) {
            $exam = $application->scholarshipExam;

            // Seans kontrolü ve derslik atama
            if ($application->session_id && $application->session_time) {
                $this->assignClassroom($application);
            }

            // Ön kayıt havuzuna ekle (eğer ayarlanmışsa)
            if ($exam->auto_register_to_leads && !$application->lead_id) {
                $lead = $this->createLeadFromApplication($application);
                $application->lead_id = $lead->id;
            }

            // Okuldaki mevcut öğrencileri otomatik kayıt (eğer ayarlanmışsa)
            if ($exam->auto_register_students && !$application->student_id) {
                $student = $this->autoRegisterStudent($application);
                if ($student) {
                    $application->student_id = $student->id;
                }
            }

            // Durumu güncelle
            $application->status = 'approved';
            $application->processed_at = now();
            $application->save();

            return $application->load(['scholarshipExam', 'student', 'lead', 'classroom']);
        });
    }

    /**
     * Assign classroom to application.
     *
     * @param ScholarshipExamApplication $application
     * @return void
     * @throws \Exception
     */
    protected function assignClassroom(ScholarshipExamApplication $application): void
    {
        $exam = $application->scholarshipExam;
        $sessionId = $application->session_id;

        // Seans bilgisini al
        $sessions = $exam->sessions ?? [];
        $session = collect($sessions)->firstWhere('id', $sessionId);

        if (!$session) {
            throw new \Exception('Seans bulunamadı.');
        }

        // Derslik kapasitesine göre yerleştir
        $classroom = $this->findAvailableClassroom($exam, $sessionId);

        if (!$classroom) {
            throw new \Exception('Uygun derslik bulunamadı.');
        }

        // Sıra numarasını belirle
        $seatNumber = $this->getNextSeatNumber($classroom, $exam, $sessionId);

        // Optik form kodunu oluştur
        $opticalFormCode = $this->generateOpticalFormCode($exam, $classroom, $seatNumber);

        $application->classroom_id = $classroom->id;
        $application->seat_number = $seatNumber;
        $application->optical_form_code = $opticalFormCode;
        $application->save();
    }

    /**
     * Find available classroom for session.
     *
     * @param ScholarshipExam $exam
     * @param string $sessionId
     * @return Classroom|null
     */
    protected function findAvailableClassroom(ScholarshipExam $exam, string $sessionId): ?Classroom
    {
        // Bu seans için atanan başvuruları say
        $assignedCount = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
            ->where('session_id', $sessionId)
            ->whereNotNull('classroom_id')
            ->count();

        // Boş kapasitesi olan derslik bul
        $classrooms = Classroom::where('tenant_id', $exam->tenant_id)
            ->where('is_active', true)
            ->orderBy('capacity', 'desc')
            ->get();

        foreach ($classrooms as $classroom) {
            $usedSeats = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
                ->where('session_id', $sessionId)
                ->where('classroom_id', $classroom->id)
                ->count();

            if ($usedSeats < $classroom->capacity) {
                return $classroom;
            }
        }

        return null;
    }

    /**
     * Get next seat number for classroom.
     *
     * @param Classroom $classroom
     * @param ScholarshipExam $exam
     * @param string $sessionId
     * @return int
     */
    protected function getNextSeatNumber(Classroom $classroom, ScholarshipExam $exam, string $sessionId): int
    {
        $maxSeat = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
            ->where('session_id', $sessionId)
            ->where('classroom_id', $classroom->id)
            ->max('seat_number') ?? 0;

        return $maxSeat + 1;
    }

    /**
     * Generate optical form code.
     *
     * @param ScholarshipExam $exam
     * @param Classroom $classroom
     * @param int $seatNumber
     * @return string
     */
    protected function generateOpticalFormCode(ScholarshipExam $exam, Classroom $classroom, int $seatNumber): string
    {
        return sprintf('BS%d-%d-%d', $exam->id, $classroom->id, $seatNumber);
    }

    /**
     * Create lead from application.
     *
     * @param ScholarshipExamApplication $application
     * @return Lead
     */
    protected function createLeadFromApplication(ScholarshipExamApplication $application): Lead
    {
        return Lead::create([
            'name' => $application->name,
            'phone' => $application->phone,
            'email' => $application->email,
            'notes' => "Bursluluk sınavı başvurusu: {$application->application_number}",
            'status' => 'new',
            'source' => 'scholarship_exam',
        ]);
    }

    /**
     * Get application statistics.
     *
     * @param ScholarshipExam $exam
     * @return array
     */
    public function getStatistics(ScholarshipExam $exam): array
    {
        $total = $exam->applications()->count();
        $pending = $exam->applications()->where('status', 'pending')->count();
        $approved = $exam->applications()->where('status', 'approved')->count();
        $rejected = $exam->applications()->where('status', 'rejected')->count();
        $attended = $exam->applications()->where('status', 'attended')->count();
        $absent = $exam->applications()->where('status', 'absent')->count();

        // Seans bazlı istatistikler
        $sessions = collect($exam->sessions ?? [])->map(function ($session) use ($exam) {
            $sessionApplications = $exam->applications()
                ->where('session_id', $session['id'])
                ->get();

            return [
                'id' => $session['id'],
                'time' => $session['time'],
                'capacity' => $session['capacity'] ?? 0,
                'total' => $sessionApplications->count(),
                'approved' => $sessionApplications->where('status', 'approved')->count(),
            ];
        });

        return [
            'total' => $total,
            'pending' => $pending,
            'approved' => $approved,
            'rejected' => $rejected,
            'attended' => $attended,
            'absent' => $absent,
            'sessions' => $sessions,
        ];
    }

    public function generateSeatingPlan(ScholarshipExam $exam, array $classroomIds, array $options = []): array
    {
        return DB::transaction(function () use ($exam, $classroomIds, $options) {
            $sessionId = $options['session_id'] ?? null;
            $shuffle = $options['shuffle'] ?? true;
            $sameSchoolApart = $options['same_school_apart'] ?? false;
            $sameGradeApart = $options['same_grade_apart'] ?? false;
            $capacityOverrides = $options['capacity'] ?? [];

            $classrooms = Classroom::whereIn('id', $classroomIds)
                ->where('tenant_id', $exam->tenant_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get();

            if ($classrooms->isEmpty()) {
                throw new \Exception('Seçilen derslikler bulunamadı.');
            }

            $applicationsQuery = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
                ->where('status', 'approved');

            if ($sessionId) {
                $applicationsQuery->where('session_id', $sessionId);
            }

            $applications = $applicationsQuery
                ->orderBy('id')
                ->get();

            if ($applications->isEmpty()) {
                throw new \Exception('Yerleştirilecek onaylanmış başvuru bulunamadı.');
            }

            ScholarshipExamApplication::whereIn('id', $applications->pluck('id'))
                ->update([
                    'classroom_id' => null,
                    'seat_number' => null,
                    'optical_form_code' => null,
                ]);

            $orderedApplications = $applications;

            if ($sameSchoolApart) {
                $orderedApplications = $this->interleaveCollectionByKey($orderedApplications, fn(ScholarshipExamApplication $a) => $a->school_name ?: '');
            }

            if ($sameGradeApart) {
                $orderedApplications = $this->interleaveCollectionByKey($orderedApplications, fn(ScholarshipExamApplication $a) => $a->grade_level ?: '');
            }

            if ($shuffle) {
                $orderedApplications = $orderedApplications->shuffle();
            }

            $totalCapacity = $classrooms->sum(function (Classroom $c) use ($capacityOverrides) {
                $override = $capacityOverrides[$c->id] ?? null;
                return (int) ($override ?: $c->capacity);
            });

            if ($totalCapacity < $orderedApplications->count()) {
                $remaining = $orderedApplications->count() - $totalCapacity;
                throw new \Exception("{$remaining} kişi için yeterli derslik kapasitesi yok.");
            }

            $result = [
                'exam_id' => $exam->id,
                'session_id' => $sessionId,
                'total_applications' => $orderedApplications->count(),
                'total_classrooms' => $classrooms->count(),
                'arrangements' => [],
            ];

            $appIndex = 0;
            foreach ($classrooms as $classroom) {
                $capacity = (int) ($capacityOverrides[$classroom->id] ?? $classroom->capacity);
                $assigned = 0;
                $seatNumber = 1;

                while ($appIndex < $orderedApplications->count() && $assigned < $capacity) {
                    /** @var ScholarshipExamApplication $application */
                    $application = $orderedApplications[$appIndex];

                    $application->classroom_id = $classroom->id;
                    $application->seat_number = $seatNumber;
                    $application->optical_form_code = $this->generateOpticalFormCode($exam, $classroom, $seatNumber);
                    $application->save();

                    $appIndex++;
                    $assigned++;
                    $seatNumber++;
                }

                $result['arrangements'][] = [
                    'classroom_id' => $classroom->id,
                    'classroom_name' => $classroom->name,
                    'capacity' => $capacity,
                    'assigned' => $assigned,
                ];
            }

            return $result;
        });
    }

    protected function interleaveCollectionByKey(Collection $items, callable $keyFn): Collection
    {
        $groups = $items->groupBy(function ($item) use ($keyFn) {
            $key = $keyFn($item);
            return $key === null ? '' : (string) $key;
        });

        $queues = $groups->map(fn(Collection $c) => $c->values());
        $result = collect();
        $hasMore = true;

        while ($hasMore) {
            $hasMore = false;
            foreach ($queues as $queue) {
                if ($queue->isEmpty()) {
                    continue;
                }
                $result->push($queue->shift());
                $hasMore = true;
            }
        }

        return $result;
    }

    /**
     * Auto-register existing student from application.
     *
     * @param ScholarshipExamApplication $application
     * @return Student|null
     */
    protected function autoRegisterStudent(ScholarshipExamApplication $application): ?Student
    {
        try {
            // TCKN veya telefon ile mevcut öğrenciyi bul
            $student = Student::where('tenant_id', $application->scholarshipExam->tenant_id)
                ->where(function ($q) use ($application) {
                    if ($application->tc_no) {
                        $q->where('tc_no', $application->tc_no);
                    } elseif ($application->phone) {
                        // Student modelinde phone field'ı yok, guardian üzerinden kontrol edilebilir
                        // Şimdilik sadece TCKN ile kontrol ediyoruz
                    }
                })
                ->first();

            return $student;
        } catch (\Exception $e) {
            \Log::error('Bursluluk sınavı otomatik öğrenci kaydı hatası', [
                'application_id' => $application->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
