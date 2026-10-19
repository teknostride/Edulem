<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamClassroom;
use App\Models\ExamClassroomStudent;
use App\Models\Student;
use App\Models\Classroom;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class ExamClassroomArrangementService
{
    /**
     * Arrange students to exam classrooms with shuffling.
     *
     * @param  \App\Models\Exam  $exam
     * @param  array  $classroomIds
     * @param  array  $options
     * @return array
     */
    public function arrangeStudents(Exam $exam, array $classroomIds, array $options = []): array
    {
        $shuffle = $options['shuffle'] ?? true;
        $sortBy = $options['sort_by'] ?? 'surname'; // surname, classroom, room
        $preserveClassroom = $options['preserve_classroom'] ?? false;

        // Mevcut düzenlemeyi temizle
        $this->clearArrangement($exam);

        // Öğrencileri al
        $students = $this->getStudentsForExam($exam, $preserveClassroom);

        // Öğrencileri sırala
        $students = $this->sortStudents($students, $sortBy);

        // Öğrencileri karıştır (eğer istenirse)
        if ($shuffle) {
            $students = $students->shuffle();
        }

        // Derslikleri al ve kapasitelerini kontrol et
        $classrooms = Classroom::whereIn('id', $classroomIds)
            ->where('tenant_id', $exam->tenant_id)
            ->orderBy('name')
            ->get();

        if ($classrooms->isEmpty()) {
            throw new \Exception('Seçilen derslikler bulunamadı.');
        }

        // Öğrencileri dersliklere dağıt
        $arrangements = [];
        $studentIndex = 0;
        $seatNumber = 1;

        foreach ($classrooms as $index => $classroom) {
            $capacity = $options['capacity'][$classroom->id] ?? $classroom->capacity;
            
            $examClassroom = ExamClassroom::create([
                'tenant_id' => $exam->tenant_id,
                'exam_id' => $exam->id,
                'classroom_id' => $classroom->id,
                'capacity' => $capacity,
                'order' => $index + 1,
            ]);

            $classroomStudents = [];
            $classroomStudentCount = 0;

            while ($studentIndex < $students->count() && $classroomStudentCount < $capacity) {
                $student = $students[$studentIndex];
                
                // Optik form kodu oluştur
                $opticalFormCode = $this->generateOpticalFormCode($examClassroom, $seatNumber);

                ExamClassroomStudent::create([
                    'tenant_id' => $exam->tenant_id,
                    'exam_classroom_id' => $examClassroom->id,
                    'student_id' => $student->id,
                    'seat_number' => $seatNumber,
                    'optical_form_code' => $opticalFormCode,
                    'order' => $classroomStudentCount + 1,
                ]);

                $classroomStudents[] = [
                    'student' => $student,
                    'seat_number' => $seatNumber,
                    'optical_form_code' => $opticalFormCode,
                ];

                $studentIndex++;
                $classroomStudentCount++;
                $seatNumber++;
            }

            $examClassroom->update(['student_count' => $classroomStudentCount]);

            $arrangements[] = [
                'exam_classroom' => $examClassroom,
                'students' => $classroomStudents,
            ];
        }

        // Kalan öğrenciler varsa uyarı ver
        if ($studentIndex < $students->count()) {
            $remaining = $students->count() - $studentIndex;
            throw new \Exception("{$remaining} öğrenci için yeterli derslik kapasitesi yok.");
        }

        return $arrangements;
    }

    /**
     * Get students for exam.
     *
     * @param  \App\Models\Exam  $exam
     * @param  bool  $preserveClassroom
     * @return \Illuminate\Support\Collection
     */
    protected function getStudentsForExam(Exam $exam, bool $preserveClassroom = false): Collection
    {
        if ($preserveClassroom && $exam->classroom_id) {
            // Sadece sınavın sınıfındaki öğrenciler
            return Student::where('tenant_id', $exam->tenant_id)
                ->where('classroom_id', $exam->classroom_id)
                ->where('is_active', true)
                ->get();
        }

        // Tüm aktif öğrenciler (veya exam'a göre filtreleme yapılabilir)
        return Student::where('tenant_id', $exam->tenant_id)
            ->where('is_active', true)
            ->get();
    }

    /**
     * Sort students by criteria.
     *
     * @param  \Illuminate\Support\Collection  $students
     * @param  string  $sortBy
     * @return \Illuminate\Support\Collection
     */
    protected function sortStudents(Collection $students, string $sortBy): Collection
    {
        return match ($sortBy) {
            'surname' => $students->sortBy(function ($student) {
                $nameParts = explode(' ', $student->name);
                return end($nameParts) ?? $student->name;
            }),
            'classroom' => $students->sortBy([
                ['classroom_id', 'asc'],
                ['name', 'asc'],
            ]),
            'room' => $students->sortBy('name'),
            default => $students->sortBy('name'),
        };
    }

    /**
     * Generate optical form code.
     *
     * @param  \App\Models\ExamClassroom  $examClassroom
     * @param  int  $seatNumber
     * @return string
     */
    protected function generateOpticalFormCode(ExamClassroom $examClassroom, int $seatNumber): string
    {
        // Format: EXAM_ID-CLASSROOM_ORDER-SEAT_NUMBER
        // Örnek: 123-1-15 (123 numaralı sınav, 1. derslik, 15. sıra)
        return sprintf(
            '%d-%d-%d',
            $examClassroom->exam_id,
            $examClassroom->order,
            $seatNumber
        );
    }

    /**
     * Clear existing arrangement for exam.
     *
     * @param  \App\Models\Exam  $exam
     * @return void
     */
    public function clearArrangement(Exam $exam): void
    {
        ExamClassroom::where('exam_id', $exam->id)->delete();
    }

    /**
     * Get arrangement lists sorted by different criteria.
     *
     * @param  \App\Models\Exam  $exam
     * @param  string  $sortBy
     * @return array
     */
    public function getArrangementLists(Exam $exam, string $sortBy = 'room'): array
    {
        $examClassrooms = ExamClassroom::where('exam_id', $exam->id)
            ->with(['classroom', 'students.student'])
            ->orderBy('order')
            ->get();

        $lists = [];

        foreach ($examClassrooms as $examClassroom) {
            $students = $examClassroom->students->map(function ($ecs) {
                return [
                    'student' => $ecs->student,
                    'seat_number' => $ecs->seat_number,
                    'optical_form_code' => $ecs->optical_form_code,
                ];
            });

            // Sıralama
            $students = match ($sortBy) {
                'surname' => $students->sortBy(function ($item) {
                    $nameParts = explode(' ', $item['student']->name);
                    return end($nameParts) ?? $item['student']->name;
                }),
                'classroom' => $students->sortBy([
                    ['student.classroom_id', 'asc'],
                    ['student.name', 'asc'],
                ]),
                'room' => $students->sortBy('seat_number'),
                default => $students,
            };

            $lists[] = [
                'exam_classroom' => $examClassroom,
                'classroom' => $examClassroom->classroom,
                'students' => $students->values()->all(),
            ];
        }

        return $lists;
    }
}
