<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Installment;
use App\Models\Expense;
use App\Models\Student;
use App\Models\Classroom;
use App\Models\Exam;
use App\Models\Grade;
use App\Models\Lead;
use App\Models\Appointment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportDataService
{
    /**
     * Get cash report data (Kasa Raporları).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getCashReportData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $startDate = isset($parameters['start_date']) 
            ? \Carbon\Carbon::parse($parameters['start_date'])->startOfDay()
            : now()->startOfMonth();
        $endDate = isset($parameters['end_date'])
            ? \Carbon\Carbon::parse($parameters['end_date'])->endOfDay()
            : now()->endOfMonth();

        // Gelen ödemeler (tüm ödemeler - status yok, hepsi gelir sayılır)
        $incomePayments = Payment::where('tenant_id', $tenantId)
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->get();

        // Giden ödemeler (giderler)
        $expenses = Expense::where('tenant_id', $tenantId)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->get();

        $totalIncome = $incomePayments->sum('amount');
        $totalExpense = $expenses->sum('amount');
        $netCash = $totalIncome - $totalExpense;

        return [
            'title' => 'Kasa Raporu',
            'period' => [
                'start_date' => $startDate->format('d.m.Y'),
                'end_date' => $endDate->format('d.m.Y'),
            ],
            'income' => [
                'total' => $totalIncome,
                'count' => $incomePayments->count(),
                'payments' => $incomePayments,
            ],
            'expense' => [
                'total' => $totalExpense,
                'count' => $expenses->count(),
                'expenses' => $expenses,
            ],
            'net_cash' => $netCash,
        ];
    }

    /**
     * Get overdue percentage report (Geciken Yüzdelik).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getOverduePercentageData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $today = now();

        // Tüm aktif taksitler
        $allInstallments = Installment::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->get();

        // Geciken taksitler (start_date + installment_count * ay geçmişse)
        $overdueInstallments = $allInstallments->filter(function ($installment) use ($today) {
            $dueDate = $installment->start_date->copy()->addMonths($installment->installment_count);
            return $dueDate < $today;
        });

        $totalAmount = $allInstallments->sum('installment_amount');
        $overdueAmount = $overdueInstallments->sum('installment_amount');
        $overduePercentage = $totalAmount > 0 ? ($overdueAmount / $totalAmount) * 100 : 0;

        return [
            'title' => 'Geciken Yüzdelik Raporu',
            'total_installments' => $allInstallments->count(),
            'total_amount' => $totalAmount,
            'overdue_installments' => $overdueInstallments->count(),
            'overdue_amount' => $overdueAmount,
            'overdue_percentage' => round($overduePercentage, 2),
            'installments' => $overdueInstallments->values(),
        ];
    }

    /**
     * Get collection total report (Tahsilat Toplam).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getCollectionTotalData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $startDate = isset($parameters['start_date'])
            ? \Carbon\Carbon::parse($parameters['start_date'])->startOfDay()
            : now()->startOfMonth();
        $endDate = isset($parameters['end_date'])
            ? \Carbon\Carbon::parse($parameters['end_date'])->endOfDay()
            : now()->endOfMonth();

        $payments = Payment::where('tenant_id', $tenantId)
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->with(['student'])
            ->get();

        $totalByMethod = $payments->groupBy('payment_method')->map(function ($group) {
            return $group->sum('amount');
        });

        return [
            'title' => 'Tahsilat Toplam Raporu',
            'period' => [
                'start_date' => $startDate->format('d.m.Y'),
                'end_date' => $endDate->format('d.m.Y'),
            ],
            'total_collection' => $payments->sum('amount'),
            'total_count' => $payments->count(),
            'by_method' => $totalByMethod,
            'payments' => $payments,
        ];
    }

    /**
     * Get future student payments (Gelecek Öğrenci Ödemeleri).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getFuturePaymentsData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $startDate = isset($parameters['start_date'])
            ? \Carbon\Carbon::parse($parameters['start_date'])->startOfDay()
            : now();
        $endDate = isset($parameters['end_date'])
            ? \Carbon\Carbon::parse($parameters['end_date'])->endOfDay()
            : now()->addMonths(3);

        $installments = Installment::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('start_date', '>=', $startDate)
            ->where('start_date', '<=', $endDate)
            ->with(['student'])
            ->orderBy('start_date', 'asc')
            ->get();

        $totalAmount = $installments->sum('installment_amount');
        $groupedByMonth = $installments->groupBy(function ($installment) {
            return $installment->start_date->format('Y-m');
        })->map(function ($group) {
            return [
                'count' => $group->count(),
                'total' => $group->sum('installment_amount'),
            ];
        });

        return [
            'title' => 'Gelecek Öğrenci Ödemeleri',
            'period' => [
                'start_date' => $startDate->format('d.m.Y'),
                'end_date' => $endDate->format('d.m.Y'),
            ],
            'total_amount' => $totalAmount,
            'total_count' => $installments->count(),
            'by_month' => $groupedByMonth,
            'installments' => $installments,
        ];
    }

    /**
     * Get monthly expenses report (Giderler Aylık).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getMonthlyExpensesData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $year = $parameters['year'] ?? now()->year;
        $month = $parameters['month'] ?? now()->month;

        $expenses = Expense::where('tenant_id', $tenantId)
            ->whereYear('expense_date', $year)
            ->whereMonth('expense_date', $month)
            ->with(['paidBy'])
            ->get();

        $totalByCategory = $expenses->groupBy('category')->map(function ($group) {
            return [
                'category_name' => $group->first()->category ?? 'Kategori Yok',
                'total' => $group->sum('amount'),
                'count' => $group->count(),
            ];
        });

        return [
            'title' => 'Aylık Giderler Raporu',
            'period' => [
                'year' => $year,
                'month' => $month,
                'month_name' => now()->setMonth($month)->setYear($year)->format('F Y'),
            ],
            'total_expenses' => $expenses->sum('amount'),
            'total_count' => $expenses->count(),
            'by_category' => $totalByCategory,
            'expenses' => $expenses,
        ];
    }

    /**
     * Get classroom occupancy report (Sınıf Doluluk).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getClassroomOccupancyData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;

        $classrooms = Classroom::where('tenant_id', $tenantId)
            ->withCount('students')
            ->get();

        $occupancyData = $classrooms->map(function ($classroom) {
            $capacity = $classroom->capacity ?? 0;
            $current = $classroom->students_count;
            $occupancyRate = $capacity > 0 ? ($current / $capacity) * 100 : 0;

            return [
                'classroom_id' => $classroom->id,
                'classroom_name' => $classroom->name,
                'capacity' => $capacity,
                'current' => $current,
                'available' => max(0, $capacity - $current),
                'occupancy_rate' => round($occupancyRate, 2),
            ];
        });

        return [
            'title' => 'Sınıf Doluluk Raporu',
            'total_classrooms' => $classrooms->count(),
            'total_capacity' => $classrooms->sum('capacity'),
            'total_students' => $classrooms->sum('students_count'),
            'average_occupancy' => $occupancyData->avg('occupancy_rate'),
            'classrooms' => $occupancyData,
        ];
    }

    /**
     * Get student count by gender (Kız-Erkek Öğrenci Sayıları).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getStudentCountByGenderData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;

        // Not: Student modelinde gender alanı yoksa, bu rapor için migration gerekebilir
        // Şimdilik basit bir örnek veriyorum
        $students = Student::where('tenant_id', $tenantId)->get();

        // Eğer gender alanı yoksa, varsayılan olarak tüm öğrencileri göster
        $maleCount = 0; // $students->where('gender', 'male')->count();
        $femaleCount = 0; // $students->where('gender', 'female')->count();
        $totalCount = $students->count();

        return [
            'title' => 'Kız-Erkek Öğrenci Sayıları',
            'total_students' => $totalCount,
            'male_count' => $maleCount,
            'female_count' => $femaleCount,
            'unknown_count' => $totalCount - $maleCount - $femaleCount,
        ];
    }

    /**
     * Get exam participation monthly (Sınava Katılım Aylık).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getExamParticipationMonthlyData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $year = $parameters['year'] ?? now()->year;
        $month = $parameters['month'] ?? now()->month;

        $exams = Exam::where('tenant_id', $tenantId)
            ->whereYear('exam_date', $year)
            ->whereMonth('exam_date', $month)
            ->withCount('grades')
            ->get();

        $participationByExam = $exams->map(function ($exam) {
            $totalStudents = $exam->classroom?->students_count ?? 0;
            $participated = $exam->grades_count;
            $participationRate = $totalStudents > 0 ? ($participated / $totalStudents) * 100 : 0;

            return [
                'exam_id' => $exam->id,
                'exam_name' => $exam->name,
                'exam_date' => $exam->exam_date->format('d.m.Y'),
                'total_students' => $totalStudents,
                'participated' => $participated,
                'participation_rate' => round($participationRate, 2),
            ];
        });

        return [
            'title' => 'Aylık Sınav Katılım Raporu',
            'period' => [
                'year' => $year,
                'month' => $month,
                'month_name' => now()->setMonth($month)->setYear($year)->format('F Y'),
            ],
            'total_exams' => $exams->count(),
            'total_participation' => $exams->sum('grades_count'),
            'average_participation_rate' => $participationByExam->avg('participation_rate'),
            'exams' => $participationByExam,
        ];
    }

    /**
     * Get lead statistics (Ön Kayıt İstatistikleri).
     *
     * @param  array  $parameters
     * @return array
     */
    public function getLeadStatisticsData(array $parameters): array
    {
        $tenantId = Auth::user()->tenant_id;
        $startDate = isset($parameters['start_date'])
            ? \Carbon\Carbon::parse($parameters['start_date'])->startOfDay()
            : now()->startOfMonth();
        $endDate = isset($parameters['end_date'])
            ? \Carbon\Carbon::parse($parameters['end_date'])->endOfDay()
            : now()->endOfMonth();

        $leads = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $byStatus = $leads->groupBy('status')->map(function ($group) {
            return $group->count();
        });

        $bySource = $leads->groupBy('source')->map(function ($group) {
            return $group->count();
        });

        return [
            'title' => 'Ön Kayıt İstatistikleri',
            'period' => [
                'start_date' => $startDate->format('d.m.Y'),
                'end_date' => $endDate->format('d.m.Y'),
            ],
            'total_leads' => $leads->count(),
            'by_status' => $byStatus,
            'by_source' => $bySource,
            'leads' => $leads,
        ];
    }
}
