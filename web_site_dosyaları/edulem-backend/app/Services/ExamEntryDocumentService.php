<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamClassroomStudent;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ExamEntryDocumentService
{
    /**
     * Generate exam entry document PDF for a student.
     *
     * @param  \App\Models\Exam  $exam
     * @param  int  $studentId
     * @return string File path
     */
    public function generateStudentEntryDocument(Exam $exam, int $studentId): string
    {
        $examClassroomStudent = ExamClassroomStudent::whereHas('examClassroom', function ($q) use ($exam) {
            $q->where('exam_id', $exam->id);
        })
            ->where('student_id', $studentId)
            ->with(['student', 'examClassroom.classroom', 'examClassroom.exam'])
            ->firstOrFail();

        $examClassroom = $examClassroomStudent->examClassroom;
        $classroom = $examClassroom->classroom;

        $data = [
            'exam' => $exam,
            'student' => $examClassroomStudent->student,
            'examClassroom' => $examClassroom,
            'classroom' => $classroom,
            'seatNumber' => $examClassroomStudent->seat_number,
            'opticalFormCode' => $examClassroomStudent->optical_form_code,
            'tenant' => $exam->tenant,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];

        $pdf = Pdf::loadView('exams.entry-document', $data)
            ->setPaper('a4', 'portrait');

        $fileName = "exam_entry_{$exam->id}_student_{$studentId}_" . now()->format('YmdHis') . ".pdf";
        $filePath = "exams/{$exam->tenant_id}/entry-documents/{$fileName}";

        Storage::disk('local')->put($filePath, $pdf->output());

        return $filePath;
    }

    /**
     * Generate exam entry documents for all students (bulk).
     *
     * @param  \App\Models\Exam  $exam
     * @return array File paths
     */
    public function generateAllEntryDocuments(Exam $exam): array
    {
        $examClassroomStudents = ExamClassroomStudent::whereHas('examClassroom', function ($q) use ($exam) {
            $q->where('exam_id', $exam->id);
        })
            ->with(['student', 'examClassroom.classroom', 'examClassroom.exam'])
            ->get();

        $filePaths = [];

        foreach ($examClassroomStudents as $ecs) {
            try {
                $filePath = $this->generateStudentEntryDocument($exam, $ecs->student_id);
                $filePaths[] = [
                    'student_id' => $ecs->student_id,
                    'student_name' => $ecs->student->name,
                    'file_path' => $filePath,
                ];
            } catch (\Exception $e) {
                \Log::error('Sınav giriş belgesi oluşturulamadı', [
                    'exam_id' => $exam->id,
                    'student_id' => $ecs->student_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $filePaths;
    }
}
