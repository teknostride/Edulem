<?php

namespace App\Services;

use App\Models\Student;
use App\Models\Grade;
use App\Models\ReportCardTemplate;
use App\Models\AcademicYear;
use Illuminate\Support\Facades\Auth;

class ReportCardService
{
    /**
     * Get report card data for a student.
     *
     * @param  int  $studentId
     * @param  string  $semester  'first' or 'second'
     * @param  int|null  $academicYearId
     * @param  int|null  $templateId
     * @return array
     */
    public function getReportCardData(
        int $studentId,
        string $semester,
        ?int $academicYearId = null,
        ?int $templateId = null
    ): array {
        $tenantId = Auth::user()->tenant_id;
        
        // Öğrenci bilgileri
        $student = Student::with([
            'classroom',
            'academicYear',
            'guardians',
            'city',
            'district',
        ])->findOrFail($studentId);

        // Akademik yıl
        $academicYear = $academicYearId 
            ? AcademicYear::findOrFail($academicYearId)
            : $student->academicYear;

        // Şablon seçimi
        $template = $templateId
            ? ReportCardTemplate::findOrFail($templateId)
            : ReportCardTemplate::where('tenant_id', $tenantId)
                ->where('is_default', true)
                ->where('is_active', true)
                ->first();

        // Notlar (dönem bazlı)
        $grades = Grade::where('student_id', $studentId)
            ->where('semester', $semester)
            ->with([
                'exam.lesson',
                'exam.classroom',
                'teacher',
                'topics',
                'achievements',
            ])
            ->get();

        // Ders bazlı not gruplama
        $gradesByLesson = $grades->groupBy(function ($grade) {
            return $grade->exam?->lesson?->name ?? 'Bilinmeyen Ders';
        });

        // Devamsızlık bilgileri
        $attendances = $student->attendances()
            ->whereBetween('date', [
                $academicYear?->start_date ?? now()->startOfYear(),
                $academicYear?->end_date ?? now()->endOfYear(),
            ])
            ->get();

        $attendanceStats = [
            'total' => $attendances->count(),
            'present' => $attendances->where('status', 'present')->count(),
            'absent' => $attendances->where('status', 'absent')->count(),
            'late' => $attendances->where('status', 'late')->count(),
            'excused' => $attendances->where('status', 'excused')->count(),
        ];

        // Genel istatistikler
        $totalGrades = $grades->count();
        $averageGrade = $grades->avg('grade') ?? 0;
        $minGrade = $grades->min('grade') ?? 0;
        $maxGrade = $grades->max('grade') ?? 0;

        return [
            'student' => $student,
            'academic_year' => $academicYear,
            'semester' => $semester,
            'semester_name' => $semester === 'first' ? '1. Dönem' : '2. Dönem',
            'template' => $template,
            'classroom' => $student->classroom,
            'grades' => $grades,
            'grades_by_lesson' => $gradesByLesson,
            'attendance_stats' => $attendanceStats,
            'statistics' => [
                'total_grades' => $totalGrades,
                'average_grade' => round($averageGrade, 2),
                'min_grade' => round($minGrade, 2),
                'max_grade' => round($maxGrade, 2),
            ],
        ];
    }

    /**
     * Generate PDF file path for report card.
     *
     * @param  int  $studentId
     * @param  string  $semester
     * @param  int|null  $academicYearId
     * @param  int|null  $templateId
     * @return string
     */
    public function generatePdf(
        int $studentId,
        string $semester,
        ?int $academicYearId = null,
        ?int $templateId = null
    ): string {
        $data = $this->getReportCardData($studentId, $semester, $academicYearId, $templateId);
        
        $tenantId = Auth::user()->tenant_id;
        $tenant = \App\Models\Tenant::find($tenantId);
        
        // PDF oluştur
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('report_cards.report_card', [
            'data' => $data,
            'tenant' => $tenant,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ]);
        
        // Dosya adı oluştur
        $student = $data['student'];
        $fileName = sprintf(
            'karne_%s_%s_%s_%s.pdf',
            $student->school_no ?? $student->id,
            $semester,
            $data['academic_year']?->code ?? now()->year,
            now()->format('YmdHis')
        );
        
        $filePath = "report_cards/{$tenantId}/{$fileName}";
        
        // Storage'a kaydet
        \Illuminate\Support\Facades\Storage::disk('local')->put($filePath, $pdf->output());
        
        return $filePath;
    }
}
