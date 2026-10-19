<?php

namespace App\Services;

use App\Contracts\ReportExportInterface;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class PdfExportService implements ReportExportInterface
{
    /**
     * Generate and export report as PDF.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @param  string  $format
     * @return string
     */
    public function export(string $reportType, array $parameters, string $format = 'pdf'): string
    {
        $data = $this->getData($reportType, $parameters);
        
        $tenantId = Auth::user()->tenant_id ?? 'default';
        $tenant = \App\Models\Tenant::find($tenantId);
        
        // PDF oluştur
        $pdf = Pdf::loadView("reports.{$reportType}", [
            'data' => $data,
            'parameters' => $parameters,
            'tenant' => $tenant,
            'generatedAt' => now()->format('d.m.Y H:i'),
        ]);
        
        // Dosya adı oluştur
        $fileName = $this->generateFileName($reportType, $tenantId);
        $filePath = "reports/{$tenantId}/pdf/{$fileName}";
        
        // Storage'a kaydet
        Storage::disk('local')->put($filePath, $pdf->output());
        
        return $filePath;
    }

    /**
     * Get report data.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @return array
     */
    public function getData(string $reportType, array $parameters): array
    {
        $reportDataService = app(\App\Services\ReportDataService::class);

        return match ($reportType) {
            'students' => $this->getStudentsData($parameters),
            'financial' => $this->getFinancialData($parameters),
            'attendance' => $this->getAttendanceData($parameters),
            'cash_report' => $reportDataService->getCashReportData($parameters),
            'overdue_percentage' => $reportDataService->getOverduePercentageData($parameters),
            'collection_total' => $reportDataService->getCollectionTotalData($parameters),
            'future_payments' => $reportDataService->getFuturePaymentsData($parameters),
            'monthly_expenses' => $reportDataService->getMonthlyExpensesData($parameters),
            'classroom_occupancy' => $reportDataService->getClassroomOccupancyData($parameters),
            'student_count_by_gender' => $reportDataService->getStudentCountByGenderData($parameters),
            'exam_participation_monthly' => $reportDataService->getExamParticipationMonthlyData($parameters),
            'lead_statistics' => $reportDataService->getLeadStatisticsData($parameters),
            default => throw new \Exception("Desteklenmeyen rapor tipi: {$reportType}"),
        };
    }

    /**
     * Get students report data.
     *
     * @param  array  $parameters
     * @return array
     */
    protected function getStudentsData(array $parameters): array
    {
        $query = \App\Models\Student::with(['city', 'district', 'guardians']);
        
        if (isset($parameters['city_id'])) {
            $query->where('city_id', $parameters['city_id']);
        }
        
        if (isset($parameters['district_id'])) {
            $query->where('district_id', $parameters['district_id']);
        }
        
        $students = $query->get();
        
        return [
            'title' => 'Öğrenci Listesi Raporu',
            'students' => $students,
        ];
    }

    /**
     * Get financial report data.
     *
     * @param  array  $parameters
     * @return array
     */
    protected function getFinancialData(array $parameters): array
    {
        $query = \App\Models\Payment::with(['student', 'installment']);
        
        // Filtreler
        if (isset($parameters['start_date'])) {
            $query->where('payment_date', '>=', $parameters['start_date']);
        }
        
        if (isset($parameters['end_date'])) {
            $query->where('payment_date', '<=', $parameters['end_date']);
        }
        
        if (isset($parameters['student_id'])) {
            $query->where('student_id', $parameters['student_id']);
        }
        
        if (isset($parameters['status'])) {
            $query->where('status', $parameters['status']);
        }
        
        $payments = $query->orderBy('payment_date', 'desc')->get();
        
        // İstatistikler
        $totalAmount = $payments->where('status', 'completed')->sum('amount');
        $completedCount = $payments->where('status', 'completed')->count();
        $pendingCount = $payments->where('status', 'pending')->count();
        
        return [
            'title' => 'Finansal Rapor',
            'payments' => $payments,
            'statistics' => [
                'total_amount' => $totalAmount,
                'completed_count' => $completedCount,
                'pending_count' => $pendingCount,
                'total_count' => $payments->count(),
            ],
        ];
    }

    /**
     * Get attendance report data.
     *
     * @param  array  $parameters
     * @return array
     */
    protected function getAttendanceData(array $parameters): array
    {
        $query = \App\Models\Attendance::with(['student', 'schedule.lesson']);
        
        // Filtreler
        if (isset($parameters['start_date'])) {
            $query->where('date', '>=', $parameters['start_date']);
        }
        
        if (isset($parameters['end_date'])) {
            $query->where('date', '<=', $parameters['end_date']);
        }
        
        if (isset($parameters['student_id'])) {
            $query->where('student_id', $parameters['student_id']);
        }
        
        if (isset($parameters['status'])) {
            $query->where('status', $parameters['status']);
        }
        
        if (isset($parameters['classroom_id'])) {
            $query->whereHas('student', function ($q) use ($parameters) {
                $q->where('classroom_id', $parameters['classroom_id']);
            });
        }
        
        $attendances = $query->orderBy('date', 'desc')->get();
        
        // İstatistikler
        $presentCount = $attendances->where('status', 'present')->count();
        $absentCount = $attendances->where('status', 'absent')->count();
        $lateCount = $attendances->where('status', 'late')->count();
        $excusedCount = $attendances->where('status', 'excused')->count();
        
        return [
            'title' => 'Devamsızlık Raporu',
            'attendances' => $attendances,
            'statistics' => [
                'present_count' => $presentCount,
                'absent_count' => $absentCount,
                'late_count' => $lateCount,
                'excused_count' => $excusedCount,
                'total_count' => $attendances->count(),
            ],
        ];
    }

    /**
     * Generate file name.
     *
     * @param  string  $reportType
     * @param  int|string  $tenantId
     * @return string
     */
    protected function generateFileName(string $reportType, int|string $tenantId): string
    {
        $timestamp = now()->format('Y-m-d_His');
        return "{$reportType}_report_{$timestamp}.pdf";
    }
}
