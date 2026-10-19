<?php

namespace Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Student;
use App\Models\Payment;
use App\Models\Installment;
use App\Models\Expense;
use App\Models\Classroom;
use App\Models\Exam;
use App\Models\Lead;
use App\Services\ReportDataService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class ReportDataServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ReportDataService $service;
    protected User $user;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::factory()->create([
            'name' => 'Test Okulu',
            'is_active' => true,
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        Auth::login($this->user);
        
        $this->service = app(ReportDataService::class);
    }

    /**
     * Test cash report data retrieval.
     */
    public function test_get_cash_report_data(): void
    {
        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Payment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'amount' => 1000,
            'payment_date' => now(),
        ]);

        Expense::factory()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 300,
            'expense_date' => now(),
        ]);

        $data = $this->service->getCashReportData([
            'start_date' => now()->startOfMonth(),
            'end_date' => now()->endOfMonth(),
        ]);

        $this->assertArrayHasKey('title', $data);
        $this->assertArrayHasKey('income', $data);
        $this->assertArrayHasKey('expense', $data);
        $this->assertArrayHasKey('net_cash', $data);
        $this->assertEquals(1000, $data['income']['total']);
        $this->assertEquals(300, $data['expense']['total']);
        $this->assertEquals(700, $data['net_cash']);
    }

    /**
     * Test overdue percentage data retrieval.
     */
    public function test_get_overdue_percentage_data(): void
    {
        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Installment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'installment_amount' => 500,
            'start_date' => now()->subMonths(2),
            'status' => 'active',
        ]);

        Installment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'installment_amount' => 500,
            'start_date' => now()->subDays(5),
            'status' => 'completed',
        ]);

        $data = $this->service->getOverduePercentageData([]);

        $this->assertArrayHasKey('overdue_percentage', $data);
        $this->assertArrayHasKey('overdue_amount', $data);
        $this->assertGreaterThan(0, $data['overdue_percentage']);
    }

    /**
     * Test collection total data retrieval.
     */
    public function test_get_collection_total_data(): void
    {
        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Payment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'amount' => 1000,
            'payment_method' => 'cash',
            'payment_date' => now(),
        ]);

        Payment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'amount' => 500,
            'payment_method' => 'credit_card',
            'payment_date' => now(),
        ]);

        $data = $this->service->getCollectionTotalData([
            'start_date' => now()->startOfMonth(),
            'end_date' => now()->endOfMonth(),
        ]);

        $this->assertArrayHasKey('total_collection', $data);
        $this->assertArrayHasKey('by_method', $data);
        $this->assertEquals(1500, $data['total_collection']);
        $this->assertArrayHasKey('cash', $data['by_method']);
        $this->assertArrayHasKey('card', $data['by_method']);
    }

    /**
     * Test future payments data retrieval.
     */
    public function test_get_future_payments_data(): void
    {
        $student = Student::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Installment::factory()->create([
            'tenant_id' => $this->tenant->id,
            'student_id' => $student->id,
            'installment_amount' => 500,
            'start_date' => now()->addDays(30),
            'status' => 'active',
        ]);

        $data = $this->service->getFuturePaymentsData([
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
        ]);

        $this->assertArrayHasKey('total_amount', $data);
        $this->assertArrayHasKey('by_month', $data);
        $this->assertEquals(500, $data['total_amount']);
    }

    /**
     * Test monthly expenses data retrieval.
     */
    public function test_get_monthly_expenses_data(): void
    {
        Expense::factory()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 200,
            'category' => 'office',
            'expense_date' => now(),
        ]);

        Expense::factory()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 300,
            'category' => 'office',
            'expense_date' => now(),
        ]);

        $data = $this->service->getMonthlyExpensesData([
            'year' => now()->year,
            'month' => now()->month,
        ]);

        $this->assertArrayHasKey('total_expenses', $data);
        $this->assertArrayHasKey('by_category', $data);
        $this->assertEquals(500, $data['total_expenses']);
    }

    /**
     * Test classroom occupancy data retrieval.
     */
    public function test_get_classroom_occupancy_data(): void
    {
        $classroom = Classroom::factory()->create([
            'tenant_id' => $this->tenant->id,
            'capacity' => 30,
        ]);

        Student::factory()->count(20)->create([
            'tenant_id' => $this->tenant->id,
            'classroom_id' => $classroom->id,
        ]);

        $data = $this->service->getClassroomOccupancyData([]);

        $this->assertArrayHasKey('classrooms', $data);
        $this->assertArrayHasKey('average_occupancy', $data);
        $this->assertCount(1, $data['classrooms']);
        $this->assertEquals(20, $data['classrooms'][0]['current']);
        $this->assertEquals(30, $data['classrooms'][0]['capacity']);
    }

    /**
     * Test student count by gender data retrieval.
     */
    public function test_get_student_count_by_gender_data(): void
    {
        Student::factory()->count(10)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $data = $this->service->getStudentCountByGenderData([]);

        $this->assertArrayHasKey('total_students', $data);
        $this->assertArrayHasKey('male_count', $data);
        $this->assertArrayHasKey('female_count', $data);
        $this->assertEquals(10, $data['total_students']);
    }

    /**
     * Test exam participation monthly data retrieval.
     */
    public function test_get_exam_participation_monthly_data(): void
    {
        $classroom = Classroom::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Exam::factory()->create([
            'tenant_id' => $this->tenant->id,
            'classroom_id' => $classroom->id,
            'exam_date' => now(),
        ]);

        $data = $this->service->getExamParticipationMonthlyData([
            'year' => now()->year,
            'month' => now()->month,
        ]);

        $this->assertArrayHasKey('exams', $data);
        $this->assertArrayHasKey('average_participation_rate', $data);
    }

    /**
     * Test lead statistics data retrieval.
     */
    public function test_get_lead_statistics_data(): void
    {
        Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'new',
            'source' => 'website',
        ]);

        Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'contacted',
            'source' => 'referral',
        ]);

        $data = $this->service->getLeadStatisticsData([
            'start_date' => now()->startOfMonth(),
            'end_date' => now()->endOfMonth(),
        ]);

        $this->assertArrayHasKey('total_leads', $data);
        $this->assertArrayHasKey('by_status', $data);
        $this->assertArrayHasKey('by_source', $data);
        $this->assertEquals(2, $data['total_leads']);
    }
}
