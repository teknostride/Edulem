<?php

namespace App\Services;

use App\Models\ScholarshipExam;
use App\Models\ScholarshipExamApplication;
use App\Models\ScholarshipExamEntryTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class ScholarshipExamEntryDocumentService
{
    /**
     * Generate scholarship exam entry document PDF for an application.
     *
     * @param  \App\Models\ScholarshipExam  $exam
     * @param  int  $applicationId
     * @return string File path
     */
    public function generateApplicationEntryDocument(ScholarshipExam $exam, int $applicationId): string
    {
        $application = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
            ->where('id', $applicationId)
            ->with(['student', 'classroom', 'scholarshipExam'])
            ->firstOrFail();

        $template = ScholarshipExamEntryTemplate::where('scholarship_exam_id', $exam->id)
            ->where('tenant_id', $exam->tenant_id)
            ->where('is_active', true)
            ->latest('id')
            ->first();

        $data = [
            'exam' => $exam,
            'application' => $application,
            'student' => $application->student,
            'classroom' => $application->classroom,
            'seatNumber' => $application->seat_number,
            'opticalFormCode' => $application->optical_form_code,
            'sessionTime' => $application->session_time,
            'tenant' => $exam->tenant,
            'template' => $template,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ];

        $pdf = Pdf::loadView('scholarship-exams.entry-document', $data)
            ->setPaper('a4', 'portrait');

        $fileName = "scholarship_exam_entry_{$exam->id}_application_{$applicationId}_" . now()->format('YmdHis') . ".pdf";
        $filePath = "scholarship-exams/{$exam->tenant_id}/entry-documents/{$fileName}";

        Storage::disk('local')->put($filePath, $pdf->output());

        return $filePath;
    }

    /**
     * Generate entry documents for all applications (bulk).
     *
     * @param  \App\Models\ScholarshipExam  $exam
     * @return array File paths
     */
    public function generateAllEntryDocuments(ScholarshipExam $exam): array
    {
        $applications = ScholarshipExamApplication::where('scholarship_exam_id', $exam->id)
            ->where('status', 'approved')
            ->with(['student', 'classroom', 'scholarshipExam'])
            ->get();

        $filePaths = [];

        foreach ($applications as $application) {
            try {
                $filePath = $this->generateApplicationEntryDocument($exam, $application->id);
                $filePaths[] = [
                    'application_id' => $application->id,
                    'application_number' => $application->application_number,
                    'student_name' => $application->name,
                    'file_path' => $filePath,
                ];
            } catch (\Exception $e) {
                \Log::error('Bursluluk sınavı giriş belgesi oluşturulamadı', [
                    'exam_id' => $exam->id,
                    'application_id' => $application->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $filePaths;
    }
}
