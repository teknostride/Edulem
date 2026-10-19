<?php

namespace App\Services;

use App\Contracts\ReportExportInterface;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\Auth;

class ExcelExportService implements ReportExportInterface
{
    /**
     * Generate and export report as Excel.
     *
     * @param  string  $reportType
     * @param  array  $parameters
     * @param  string  $format
     * @return string
     */
    public function export(string $reportType, array $parameters, string $format = 'excel'): string
    {
        $data = $this->getData($reportType, $parameters);
        
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Başlık satırı
        $headers = $data['headers'] ?? [];
        $row = 1;
        
        // Başlık stilini ayarla
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 12,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];
        
        // Başlıkları yaz
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . $row, $header);
            $sheet->getStyle($col . $row)->applyFromArray($headerStyle);
            $col++;
        }
        
        // Veri satırlarını yaz
        $row = 2;
        foreach ($data['rows'] ?? [] as $rowData) {
            $col = 'A';
            foreach ($rowData as $cellValue) {
                $sheet->setCellValue($col . $row, $cellValue);
                $col++;
            }
            $row++;
        }
        
        // Sütun genişliklerini ayarla
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
            $col++;
        }
        
        // Dosyayı kaydet
        $tenantId = Auth::user()->tenant_id ?? 'default';
        $fileName = $this->generateFileName($reportType, $tenantId);
        $filePath = "reports/{$tenantId}/excel/{$fileName}";
        
        $writer = new Xlsx($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'excel_');
        $writer->save($tempFile);
        
        // Storage'a yükle
        Storage::disk('local')->put($filePath, file_get_contents($tempFile));
        unlink($tempFile);
        
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
            'cash_report' => $this->formatCashReportData($reportDataService->getCashReportData($parameters)),
            'overdue_percentage' => $this->formatOverduePercentageData($reportDataService->getOverduePercentageData($parameters)),
            'collection_total' => $this->formatCollectionTotalData($reportDataService->getCollectionTotalData($parameters)),
            'future_payments' => $this->formatFuturePaymentsData($reportDataService->getFuturePaymentsData($parameters)),
            'monthly_expenses' => $this->formatMonthlyExpensesData($reportDataService->getMonthlyExpensesData($parameters)),
            'classroom_occupancy' => $this->formatClassroomOccupancyData($reportDataService->getClassroomOccupancyData($parameters)),
            'student_count_by_gender' => $this->formatStudentCountByGenderData($reportDataService->getStudentCountByGenderData($parameters)),
            'exam_participation_monthly' => $this->formatExamParticipationMonthlyData($reportDataService->getExamParticipationMonthlyData($parameters)),
            'lead_statistics' => $this->formatLeadStatisticsData($reportDataService->getLeadStatisticsData($parameters)),
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
        
        // Filtreler
        if (isset($parameters['city_id'])) {
            $query->where('city_id', $parameters['city_id']);
        }
        
        if (isset($parameters['district_id'])) {
            $query->where('district_id', $parameters['district_id']);
        }
        
        $students = $query->get();
        
        $headers = ['Okul No', 'TC No', 'Ad Soyad', 'İl', 'İlçe', 'Veli 1', 'Veli 2', 'Acil Durum Telefon'];
        $rows = [];
        
        foreach ($students as $student) {
            $guardians = $student->guardians;
            $rows[] = [
                $student->school_no ?? '',
                $student->tc_no ?? '',
                $student->name,
                $student->city?->name ?? '',
                $student->district?->name ?? '',
                $guardians->first()?->name ?? '',
                $guardians->skip(1)->first()?->name ?? '',
                $student->emergency_contact_info['phone'] ?? '',
            ];
        }
        
        return [
            'headers' => $headers,
            'rows' => $rows,
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
        
        $headers = ['Tarih', 'Öğrenci', 'Okul No', 'Tutar', 'Ödeme Yöntemi', 'Durum', 'Taksit No', 'Açıklama'];
        $rows = [];
        
        foreach ($payments as $payment) {
            $rows[] = [
                $payment->payment_date->format('d.m.Y'),
                $payment->student?->name ?? '',
                $payment->student?->school_no ?? '',
                number_format($payment->amount, 2, ',', '.') . ' ₺',
                $payment->payment_method,
                $payment->status === 'completed' ? 'Tamamlandı' : ($payment->status === 'pending' ? 'Beklemede' : 'İptal'),
                $payment->installment?->installment_no ?? '',
                $payment->notes ?? '',
            ];
        }
        
        return [
            'headers' => $headers,
            'rows' => $rows,
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
        
        $headers = ['Tarih', 'Öğrenci', 'Okul No', 'Ders', 'Durum', 'Notlar'];
        $rows = [];
        
        $statusLabels = [
            'present' => 'Geldi',
            'absent' => 'Gelmedi',
            'late' => 'Geç Geldi',
            'excused' => 'Mazeretli',
        ];
        
        foreach ($attendances as $attendance) {
            $rows[] = [
                $attendance->date->format('d.m.Y'),
                $attendance->student?->name ?? '',
                $attendance->student?->school_no ?? '',
                $attendance->schedule?->lesson?->name ?? 'Ders',
                $statusLabels[$attendance->status] ?? $attendance->status,
                $attendance->notes ?? '',
            ];
        }
        
        return [
            'headers' => $headers,
            'rows' => $rows,
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
        return "{$reportType}_report_{$timestamp}.xlsx";
    }

    /**
     * Format cash report data for Excel.
     */
    protected function formatCashReportData(array $data): array
    {
        $headers = ['Tarih', 'Tip', 'Açıklama', 'Tutar', 'Ödeme Yöntemi'];
        $rows = [];

        // Gelen ödemeler
        foreach ($data['income']['payments'] as $payment) {
            $rows[] = [
                $payment->payment_date->format('d.m.Y'),
                'Gelir',
                $payment->student?->name ?? 'Öğrenci',
                number_format($payment->amount, 2, ',', '.') . ' ₺',
                $payment->payment_method,
            ];
        }

        // Giden ödemeler
        foreach ($data['expense']['expenses'] as $expense) {
            $rows[] = [
                $expense->expense_date->format('d.m.Y'),
                'Gider',
                $expense->description ?? $expense->title ?? 'Gider',
                '-' . number_format($expense->amount, 2, ',', '.') . ' ₺',
                $expense->payment_method ?? 'cash',
            ];
        }

        // Özet satırı
        $rows[] = ['', '', 'TOPLAM', number_format($data['net_cash'], 2, ',', '.') . ' ₺', ''];

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_income' => $data['income']['total'],
                'total_expense' => $data['expense']['total'],
                'net_cash' => $data['net_cash'],
            ],
        ];
    }

    /**
     * Format overdue percentage data for Excel.
     */
    protected function formatOverduePercentageData(array $data): array
    {
        $headers = ['Öğrenci', 'Taksit Sayısı', 'Başlangıç Tarihi', 'Tutar', 'Durum'];
        $rows = [];

        foreach ($data['installments'] as $installment) {
            $rows[] = [
                $installment->student?->name ?? 'Öğrenci',
                $installment->installment_count ?? '',
                $installment->start_date->format('d.m.Y'),
                number_format($installment->installment_amount, 2, ',', '.') . ' ₺',
                'Gecikmiş',
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_amount' => $data['total_amount'],
                'overdue_amount' => $data['overdue_amount'],
                'overdue_percentage' => $data['overdue_percentage'],
            ],
        ];
    }

    /**
     * Format collection total data for Excel.
     */
    protected function formatCollectionTotalData(array $data): array
    {
        $headers = ['Tarih', 'Öğrenci', 'Tutar', 'Ödeme Yöntemi'];
        $rows = [];

        foreach ($data['payments'] as $payment) {
            $rows[] = [
                $payment->payment_date->format('d.m.Y'),
                $payment->student?->name ?? 'Öğrenci',
                number_format($payment->amount, 2, ',', '.') . ' ₺',
                $payment->payment_method,
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_collection' => $data['total_collection'],
                'by_method' => $data['by_method'],
            ],
        ];
    }

    /**
     * Format future payments data for Excel.
     */
    protected function formatFuturePaymentsData(array $data): array
    {
        $headers = ['Başlangıç Tarihi', 'Öğrenci', 'Taksit Sayısı', 'Tutar', 'Durum'];
        $rows = [];

        foreach ($data['installments'] as $installment) {
            $rows[] = [
                $installment->start_date->format('d.m.Y'),
                $installment->student?->name ?? 'Öğrenci',
                $installment->installment_count ?? '',
                number_format($installment->installment_amount, 2, ',', '.') . ' ₺',
                $installment->status === 'completed' ? 'Tamamlandı' : 'Aktif',
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_amount' => $data['total_amount'],
                'by_month' => $data['by_month'],
            ],
        ];
    }

    /**
     * Format monthly expenses data for Excel.
     */
    protected function formatMonthlyExpensesData(array $data): array
    {
        $headers = ['Tarih', 'Kategori', 'Açıklama', 'Tutar', 'Ödenen'];
        $rows = [];

        foreach ($data['expenses'] as $expense) {
            $rows[] = [
                $expense->expense_date->format('d.m.Y'),
                $expense->category ?? 'Kategori Yok',
                $expense->description ?? $expense->title,
                number_format($expense->amount, 2, ',', '.') . ' ₺',
                $expense->paidBy?->name ?? '',
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_expenses' => $data['total_expenses'],
                'by_category' => $data['by_category'],
            ],
        ];
    }

    /**
     * Format classroom occupancy data for Excel.
     */
    protected function formatClassroomOccupancyData(array $data): array
    {
        $headers = ['Sınıf', 'Kapasite', 'Mevcut', 'Boş', 'Doluluk %'];
        $rows = [];

        foreach ($data['classrooms'] as $classroom) {
            $rows[] = [
                $classroom['classroom_name'],
                $classroom['capacity'],
                $classroom['current'],
                $classroom['available'],
                '%' . $classroom['occupancy_rate'],
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_classrooms' => $data['total_classrooms'],
                'average_occupancy' => $data['average_occupancy'],
            ],
        ];
    }

    /**
     * Format student count by gender data for Excel.
     */
    protected function formatStudentCountByGenderData(array $data): array
    {
        $headers = ['Cinsiyet', 'Sayı', 'Yüzde'];
        $total = $data['total_students'];
        
        $rows = [
            ['Erkek', $data['male_count'], $total > 0 ? round(($data['male_count'] / $total) * 100, 2) . '%' : '0%'],
            ['Kız', $data['female_count'], $total > 0 ? round(($data['female_count'] / $total) * 100, 2) . '%' : '0%'],
            ['Toplam', $total, '100%'],
        ];

        return [
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    /**
     * Format exam participation monthly data for Excel.
     */
    protected function formatExamParticipationMonthlyData(array $data): array
    {
        $headers = ['Sınav', 'Tarih', 'Toplam Öğrenci', 'Katılan', 'Katılım %'];
        $rows = [];

        foreach ($data['exams'] as $exam) {
            $rows[] = [
                $exam['exam_name'],
                $exam['exam_date'],
                $exam['total_students'],
                $exam['participated'],
                '%' . $exam['participation_rate'],
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_exams' => $data['total_exams'],
                'average_participation_rate' => $data['average_participation_rate'],
            ],
        ];
    }

    /**
     * Format lead statistics data for Excel.
     */
    protected function formatLeadStatisticsData(array $data): array
    {
        $headers = ['Tarih', 'Ad Soyad', 'Telefon', 'Email', 'Durum', 'Kaynak'];
        $rows = [];

        foreach ($data['leads'] as $lead) {
            $rows[] = [
                $lead->created_at->format('d.m.Y'),
                $lead->name,
                $lead->phone,
                $lead->email ?? '',
                $lead->status,
                $lead->source ?? '',
            ];
        }

        return [
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'total_leads' => $data['total_leads'],
                'by_status' => $data['by_status'],
                'by_source' => $data['by_source'],
            ],
        ];
    }
}
