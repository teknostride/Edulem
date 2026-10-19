<?php

use App\Http\Controllers\ReportController;
use App\Http\Controllers\StudentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes (authentication, etc.)
Route::prefix('v1')->group(function () {
    // Authentication routes
    Route::post('/auth/login', [\App\Http\Controllers\AuthController::class, 'login']);
    Route::post('/auth/logout', [\App\Http\Controllers\AuthController::class, 'logout'])
        ->middleware('auth:sanctum');
    Route::get('/auth/me', [\App\Http\Controllers\AuthController::class, 'me'])
        ->middleware('auth:sanctum');
    Route::put('/auth/profile', [\App\Http\Controllers\AuthController::class, 'updateProfile'])
        ->middleware('auth:sanctum');
    Route::post('/auth/refresh', [\App\Http\Controllers\AuthController::class, 'refresh'])
        ->middleware('auth:sanctum');

    // Portal Authentication routes
    Route::post('/portal/guardian/login', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'login']);
    Route::post('/portal/student/login', [\App\Http\Controllers\Portal\StudentPortalController::class, 'login']);
});

// Protected routes (require authentication)
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    
    // Dashboard routes
    Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'stats']);
    
    // SuperAdmin routes
    Route::middleware([\App\Http\Middleware\EnsureSuperAdmin::class])->prefix('superadmin')->group(function () {
        Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'superAdminStats']);
        Route::get('/tenants', [\App\Http\Controllers\SuperAdminController::class, 'tenants']);
        Route::post('/tenants', [\App\Http\Controllers\SuperAdminController::class, 'createTenant']);
        Route::get('/tenants/{id}', [\App\Http\Controllers\SuperAdminController::class, 'showTenant']);
        Route::get('/tenants/{id}/stats', [\App\Http\Controllers\SuperAdminController::class, 'tenantStats']);
        Route::put('/tenants/{id}', [\App\Http\Controllers\SuperAdminController::class, 'updateTenant']);
        Route::delete('/tenants/{id}', [\App\Http\Controllers\SuperAdminController::class, 'deleteTenant']);
        Route::patch('/tenants/{id}/status', [\App\Http\Controllers\SuperAdminController::class, 'toggleTenantStatus']);
        Route::get('/activity-logs', [\App\Http\Controllers\SuperAdminController::class, 'activityLogs']);
        
        // SaaS Revenues & Expenses
        Route::prefix('saas')->group(function () {
            Route::get('/revenues', [\App\Http\Controllers\SuperAdminController::class, 'saasRevenues']);
            Route::get('/expenses', [\App\Http\Controllers\SuperAdminController::class, 'saasExpenses']);
        });
    });

    // Tenant Settings
    Route::prefix('settings')->group(function () {
        Route::get('/', [\App\Http\Controllers\TenantSettingsController::class, 'index']);
        Route::get('/{group}', [\App\Http\Controllers\TenantSettingsController::class, 'index']);
        Route::put('/', [\App\Http\Controllers\TenantSettingsController::class, 'update']);
    });

    // Impersonation
    Route::prefix('impersonation')->group(function () {
        Route::post('/start/{userId}', [\App\Http\Controllers\ImpersonationController::class, 'start']);
        Route::post('/stop', [\App\Http\Controllers\ImpersonationController::class, 'stop']);
        Route::get('/status', [\App\Http\Controllers\ImpersonationController::class, 'status']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::put('/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
        Route::put('/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
        Route::delete('/{id}', [\App\Http\Controllers\NotificationController::class, 'destroy']);
    });

    // Activity Logs
    Route::prefix('activity-logs')->group(function () {
        Route::get('/', [\App\Http\Controllers\ActivityLogController::class, 'index']);
        Route::get('/statistics', [\App\Http\Controllers\ActivityLogController::class, 'statistics']);
    });

    // Files
    Route::prefix('files')->group(function () {
        Route::post('/upload', [\App\Http\Controllers\FileController::class, 'upload']);
        Route::get('/', [\App\Http\Controllers\FileController::class, 'index']);
        Route::get('/{id}/download', [\App\Http\Controllers\FileController::class, 'download']);
        Route::delete('/{id}', [\App\Http\Controllers\FileController::class, 'destroy']);
    });

    // Academic Years (with permission checks)
    Route::prefix('academic-years')->group(function () {
        Route::post('/', [\App\Http\Controllers\AcademicYearController::class, 'store']);
        Route::get('/', [\App\Http\Controllers\AcademicYearController::class, 'index']);
        Route::get('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'show']);
        Route::get('/{academicYear}/statistics', [\App\Http\Controllers\AcademicYearController::class, 'statistics']);
        Route::put('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'update']);
        Route::delete('/{academicYear}', [\App\Http\Controllers\AcademicYearController::class, 'destroy']);
    });

    // Users (with permission checks)
    Route::prefix('users')->group(function () {
        Route::get('/', [\App\Http\Controllers\UserController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.read');
        Route::post('/', [\App\Http\Controllers\UserController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.create');
        Route::get('/{id}', [\App\Http\Controllers\UserController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.read');
        Route::put('/{id}', [\App\Http\Controllers\UserController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.update');
        Route::delete('/{id}', [\App\Http\Controllers\UserController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.delete');
    });

    // Permissions (with permission checks)
    Route::prefix('permissions')->group(function () {
        Route::get('/', [\App\Http\Controllers\PermissionController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':permissions.read');
        Route::post('/', [\App\Http\Controllers\PermissionController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':permissions.create');
        Route::get('/{id}', [\App\Http\Controllers\PermissionController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':permissions.read');
        Route::put('/{id}', [\App\Http\Controllers\PermissionController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':permissions.update');
        Route::delete('/{id}', [\App\Http\Controllers\PermissionController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':permissions.delete');
    });

    // Roles (with permission checks)
    Route::prefix('roles')->group(function () {
        Route::get('/', [\App\Http\Controllers\RoleController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':roles.read');
        Route::post('/', [\App\Http\Controllers\RoleController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':roles.create');
        Route::get('/{id}', [\App\Http\Controllers\RoleController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':roles.read');
        Route::put('/{id}', [\App\Http\Controllers\RoleController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':roles.update');
        Route::delete('/{id}', [\App\Http\Controllers\RoleController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':roles.delete');
    });

    // Messages (with permission checks)
    Route::prefix('messages')->group(function () {
        Route::get('/', [\App\Http\Controllers\MessageController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.read');
        Route::post('/', [\App\Http\Controllers\MessageController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.create');
        Route::get('/{id}', [\App\Http\Controllers\MessageController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.read');
        Route::put('/{id}', [\App\Http\Controllers\MessageController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.update');
        Route::delete('/{id}', [\App\Http\Controllers\MessageController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.delete');
        Route::put('/{id}/read', [\App\Http\Controllers\MessageController::class, 'markAsRead'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':messages.update');
    });

    // Announcements (with permission checks)
    Route::prefix('announcements')->group(function () {
        Route::get('/', [\App\Http\Controllers\AnnouncementController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.read');
        Route::post('/', [\App\Http\Controllers\AnnouncementController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.create');
        Route::get('/{id}', [\App\Http\Controllers\AnnouncementController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.read');
        Route::put('/{id}', [\App\Http\Controllers\AnnouncementController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.update');
        Route::delete('/{id}', [\App\Http\Controllers\AnnouncementController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.delete');
        Route::put('/{id}/read', [\App\Http\Controllers\AnnouncementController::class, 'markAsRead'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.update');
        Route::get('/unread-count', [\App\Http\Controllers\AnnouncementController::class, 'unreadCount'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':announcements.read');
    });

    // Time Slots (with permission checks)
    Route::prefix('time-slots')->group(function () {
        Route::get('/', [\App\Http\Controllers\TimeSlotController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/', [\App\Http\Controllers\TimeSlotController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\TimeSlotController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Schedules (with permission checks)
    Route::prefix('schedules')->group(function () {
        Route::get('/', [\App\Http\Controllers\ScheduleController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\ScheduleController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/{id}', [\App\Http\Controllers\ScheduleController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\ScheduleController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\ScheduleController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Students (with permission checks)
    Route::prefix('students')->group(function () {
        Route::post('/', [StudentController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':students.create');
        Route::get('/', [StudentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':students.read');
        Route::get('/{id}', [StudentController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':students.read');
        Route::put('/{id}', [StudentController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':students.update');
        Route::delete('/{id}', [StudentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':students.delete');
    });

    // Payments (with permission checks)
    Route::prefix('payments')->group(function () {
        Route::post('/', [\App\Http\Controllers\PaymentController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.create');
        Route::get('/', [\App\Http\Controllers\PaymentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::get('/{id}', [\App\Http\Controllers\PaymentController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::put('/{id}', [\App\Http\Controllers\PaymentController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.update');
        Route::delete('/{id}', [\App\Http\Controllers\PaymentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.delete');
    });

    // Installments (with permission checks)
    Route::prefix('installments')->group(function () {
        Route::post('/', [\App\Http\Controllers\InstallmentController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.create');
        Route::get('/', [\App\Http\Controllers\InstallmentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::get('/{id}', [\App\Http\Controllers\InstallmentController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::post('/{installmentId}/payments/{installmentPaymentId}/pay', [\App\Http\Controllers\InstallmentController::class, 'pay'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.create');
        Route::delete('/{id}', [\App\Http\Controllers\InstallmentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.delete');
    });

    // Invoices (with permission checks)
    Route::prefix('invoices')->group(function () {
        Route::post('/', [\App\Http\Controllers\InvoiceController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.create');
        Route::get('/', [\App\Http\Controllers\InvoiceController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::get('/{id}', [\App\Http\Controllers\InvoiceController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::post('/{id}/generate-pdf', [\App\Http\Controllers\InvoiceController::class, 'generatePdf'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::delete('/{id}', [\App\Http\Controllers\InvoiceController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.delete');
    });

    // Expenses (with permission checks)
    Route::prefix('expenses')->group(function () {
        Route::post('/', [\App\Http\Controllers\ExpenseController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.create');
        Route::get('/', [\App\Http\Controllers\ExpenseController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::get('/{id}', [\App\Http\Controllers\ExpenseController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.read');
        Route::put('/{id}', [\App\Http\Controllers\ExpenseController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.update');
        Route::delete('/{id}', [\App\Http\Controllers\ExpenseController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':financial.delete');
    });

    // Classrooms (with permission checks)
    Route::prefix('classrooms')->group(function () {
        Route::post('/', [\App\Http\Controllers\ClassroomController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ClassroomController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\ClassroomController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\ClassroomController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\ClassroomController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Lessons (with permission checks)
    Route::prefix('lessons')->group(function () {
        Route::post('/', [\App\Http\Controllers\LessonController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\LessonController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\LessonController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\LessonController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\LessonController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Schedules (with permission checks)
    Route::prefix('schedules')->group(function () {
        Route::post('/', [\App\Http\Controllers\ScheduleController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ScheduleController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\ScheduleController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\ScheduleController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/check-conflict', [\App\Http\Controllers\ScheduleController::class, 'checkConflict'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{id}', [\App\Http\Controllers\ScheduleController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Duty Schedules (Nöbet Programları) (with permission checks)
    Route::prefix('duty-schedules')->group(function () {
        Route::post('/', [\App\Http\Controllers\DutyScheduleController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\DutyScheduleController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{dutySchedule}', [\App\Http\Controllers\DutyScheduleController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{dutySchedule}', [\App\Http\Controllers\DutyScheduleController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/check-conflict', [\App\Http\Controllers\DutyScheduleController::class, 'checkConflict'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{dutySchedule}', [\App\Http\Controllers\DutyScheduleController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Attendances (with permission checks)
    Route::prefix('attendances')->group(function () {
        Route::post('/', [\App\Http\Controllers\AttendanceController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::post('/bulk', [\App\Http\Controllers\AttendanceController::class, 'bulkStore'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\AttendanceController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics/student/{studentId}', [\App\Http\Controllers\AttendanceController::class, 'studentStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics/teacher/{teacherId}', [\App\Http\Controllers\AttendanceController::class, 'teacherStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\AttendanceController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\AttendanceController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\AttendanceController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Homeworks (with permission checks)
    Route::prefix('homeworks')->group(function () {
        Route::post('/', [\App\Http\Controllers\HomeworkController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\HomeworkController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics/student/{studentId}', [\App\Http\Controllers\HomeworkController::class, 'studentPerformance'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics/teacher/{teacherId}', [\App\Http\Controllers\HomeworkController::class, 'teacherPerformance'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/submit', [\App\Http\Controllers\HomeworkController::class, 'submit'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/grade/{submission}', [\App\Http\Controllers\HomeworkController::class, 'grade'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/{id}', [\App\Http\Controllers\HomeworkController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\HomeworkController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\HomeworkController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Exams (with permission checks)
    Route::prefix('exams')->group(function () {
        // Exam Classroom Arrangement
        Route::post('/{exam}/arrange-classrooms', [\App\Http\Controllers\ExamController::class, 'arrangeClassrooms'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/{exam}/arrangement-lists', [\App\Http\Controllers\ExamController::class, 'getArrangementLists'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{exam}/clear-arrangement', [\App\Http\Controllers\ExamController::class, 'clearArrangement'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{exam}/generate-entry-document', [\App\Http\Controllers\ExamController::class, 'generateEntryDocument'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{exam}/entry-document/{student}', [\App\Http\Controllers\ExamController::class, 'downloadEntryDocument'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read')
            ->name('api.v1.exams.entry-document.download');
        Route::post('/', [\App\Http\Controllers\ExamController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ExamController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\ExamController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\ExamController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\ExamController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{id}/upload-optical-form', [\App\Http\Controllers\ExamController::class, 'uploadOpticalForm'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{id}/process-optical-form', [\App\Http\Controllers\ExamController::class, 'processOpticalForm'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Exam Score Coefficients (Puan Katsayıları) (with permission checks)
    Route::prefix('exam-score-coefficients')->group(function () {
        Route::post('/', [\App\Http\Controllers\ExamScoreCoefficientController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ExamScoreCoefficientController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{coefficient}', [\App\Http\Controllers\ExamScoreCoefficientController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{coefficient}', [\App\Http\Controllers\ExamScoreCoefficientController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Exam Topics (Sınav Konuları) (with permission checks)
    Route::prefix('exam-topics')->group(function () {
        Route::post('/', [\App\Http\Controllers\ExamTopicController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ExamTopicController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{topic}', [\App\Http\Controllers\ExamTopicController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{topic}', [\App\Http\Controllers\ExamTopicController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Report Card Templates (Karne Şablonları) (with permission checks)
    Route::prefix('report-card-templates')->group(function () {
        Route::post('/', [\App\Http\Controllers\ReportCardTemplateController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ReportCardTemplateController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{template}', [\App\Http\Controllers\ReportCardTemplateController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{template}', [\App\Http\Controllers\ReportCardTemplateController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Grades (with permission checks)
    Route::prefix('grades')->group(function () {
        Route::post('/', [\App\Http\Controllers\GradeController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\GradeController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\GradeController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\GradeController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\GradeController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/report-card/generate', [\App\Http\Controllers\GradeController::class, 'generateReportCard'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/report-card/download', [\App\Http\Controllers\GradeController::class, 'downloadReportCard'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read')
            ->name('api.v1.grades.report-card.download');
    });

    // Grade Topics (Not Konuları) (with permission checks)
    Route::prefix('grade-topics')->group(function () {
        Route::post('/', [\App\Http\Controllers\GradeTopicController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\GradeTopicController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{topic}', [\App\Http\Controllers\GradeTopicController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{topic}', [\App\Http\Controllers\GradeTopicController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Questions (with permission checks)
    Route::prefix('questions')->group(function () {
        Route::post('/', [\App\Http\Controllers\QuestionController::class, 'store']);
        Route::get('/', [\App\Http\Controllers\QuestionController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{id}', [\App\Http\Controllers\QuestionController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\QuestionController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.update');
        Route::delete('/{id}', [\App\Http\Controllers\QuestionController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // Online Exams (Online Sınav) (with permission checks)
    Route::prefix('online-exams')->group(function () {
        Route::post('/', [\App\Http\Controllers\OnlineExamController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\OnlineExamController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineExam}', [\App\Http\Controllers\OnlineExamController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{onlineExam}', [\App\Http\Controllers\OnlineExamController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{onlineExam}', [\App\Http\Controllers\OnlineExamController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{onlineExam}/start-attempt', [\App\Http\Controllers\OnlineExamController::class, 'startAttempt'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineExam}/current-attempt/{studentId}', [\App\Http\Controllers\OnlineExamController::class, 'getCurrentAttempt'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineExam}/student-attempts/{studentId}', [\App\Http\Controllers\OnlineExamController::class, 'getStudentAttempts'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineExam}/statistics', [\App\Http\Controllers\OnlineExamController::class, 'getRealTimeStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/auto-submit-expired', [\App\Http\Controllers\OnlineExamController::class, 'autoSubmitExpired'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Online Exam Attempts (Online Sınav Denemeleri) (with permission checks)
    Route::prefix('online-exam-attempts')->group(function () {
        Route::post('/{onlineExamAttempt}/save-answer', [\App\Http\Controllers\OnlineExamController::class, 'saveAnswer'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{onlineExamAttempt}/submit', [\App\Http\Controllers\OnlineExamController::class, 'submitAttempt'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Scholarship Exams (Bursluluk Sınavı) (with permission checks)
    Route::prefix('scholarship-exams')->group(function () {
        Route::post('/', [\App\Http\Controllers\ScholarshipExamController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ScholarshipExamController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{scholarshipExam}', [\App\Http\Controllers\ScholarshipExamController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{scholarshipExam}', [\App\Http\Controllers\ScholarshipExamController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{scholarshipExam}', [\App\Http\Controllers\ScholarshipExamController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{scholarshipExam}/applications', [\App\Http\Controllers\ScholarshipExamController::class, 'createApplication'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/{scholarshipExam}/applications', [\App\Http\Controllers\ScholarshipExamController::class, 'getApplications'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{scholarshipExam}/statistics', [\App\Http\Controllers\ScholarshipExamController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/{scholarshipExam}/generate-entry-document', [\App\Http\Controllers\ScholarshipExamController::class, 'generateEntryDocument'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{scholarshipExam}/entry-document/{application}', [\App\Http\Controllers\ScholarshipExamController::class, 'downloadEntryDocument'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read')
            ->name('api.v1.scholarship-exams.entry-document.download');
    });

    // Scholarship Exam Applications (Bursluluk Sınavı Başvuruları) (with permission checks)
    Route::prefix('scholarship-exam-applications')->group(function () {
        Route::post('/{application}/process', [\App\Http\Controllers\ScholarshipExamController::class, 'processApplication'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Activities (Etkinlik) (with permission checks)
    Route::prefix('activities')->group(function () {
        Route::post('/', [\App\Http\Controllers\ActivityController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ActivityController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics', [\App\Http\Controllers\ActivityController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{activity}', [\App\Http\Controllers\ActivityController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{activity}', [\App\Http\Controllers\ActivityController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{activity}', [\App\Http\Controllers\ActivityController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{activity}/approve', [\App\Http\Controllers\ActivityController::class, 'approve'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{activity}/like', [\App\Http\Controllers\ActivityController::class, 'like'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/participants', [\App\Http\Controllers\ActivityController::class, 'addParticipant'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/participants/{activityParticipant}', [\App\Http\Controllers\ActivityController::class, 'removeParticipant'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Bulletin Templates (Bülten Şablonları) (with permission checks)
    Route::prefix('bulletin-templates')->group(function () {
        Route::post('/', [\App\Http\Controllers\BulletinTemplateController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\BulletinTemplateController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{bulletinTemplate}', [\App\Http\Controllers\BulletinTemplateController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Bulletins (Bültenler) (with permission checks)
    Route::prefix('bulletins')->group(function () {
        Route::post('/', [\App\Http\Controllers\BulletinController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\BulletinController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{bulletin}', [\App\Http\Controllers\BulletinController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{bulletin}', [\App\Http\Controllers\BulletinController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{bulletin}', [\App\Http\Controllers\BulletinController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{bulletin}/publish-to-guardian', [\App\Http\Controllers\BulletinController::class, 'publishToGuardian'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{bulletin}/add-to-portfolio', [\App\Http\Controllers\BulletinController::class, 'addToPortfolio'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/student/{studentId}/portfolio', [\App\Http\Controllers\BulletinController::class, 'getStudentPortfolio'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Calendar Events (Ajanda - Akademik Takvim) (with permission checks)
    Route::prefix('calendar-events')->group(function () {
        Route::post('/', [\App\Http\Controllers\CalendarEventController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\CalendarEventController::class, 'index'])
            ->middleware('auth:sanctum'); // Herkes kendi ajandasını görebilir
        Route::get('/user-calendar', [\App\Http\Controllers\CalendarEventController::class, 'getUserCalendar'])
            ->middleware('auth:sanctum');
        Route::get('/{calendarEvent}', [\App\Http\Controllers\CalendarEventController::class, 'show'])
            ->middleware('auth:sanctum');
        Route::put('/{calendarEvent}', [\App\Http\Controllers\CalendarEventController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{calendarEvent}', [\App\Http\Controllers\CalendarEventController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/participants', [\App\Http\Controllers\CalendarEventController::class, 'addParticipant'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/participants/{calendarEventParticipant}', [\App\Http\Controllers\CalendarEventController::class, 'removeParticipant'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/participants/{calendarEventParticipant}/update-status', [\App\Http\Controllers\CalendarEventController::class, 'updateParticipantStatus'])
            ->middleware('auth:sanctum');
        Route::post('/sync-staff-assignments', [\App\Http\Controllers\CalendarEventController::class, 'syncStaffAssignments'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/sync-appointments', [\App\Http\Controllers\CalendarEventController::class, 'syncAppointments'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
                });

    // Question Bank Topics (Soru Havuzu Konuları) (with permission checks)
    Route::prefix('question-bank-topics')->group(function () {
        Route::post('/', [\App\Http\Controllers\QuestionBankTopicController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\QuestionBankTopicController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{questionBankTopic}', [\App\Http\Controllers\QuestionBankTopicController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{questionBankTopic}', [\App\Http\Controllers\QuestionBankTopicController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{questionBankTopic}', [\App\Http\Controllers\QuestionBankTopicController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Question Bank (Soru Havuzu) (with permission checks)
    Route::prefix('question-banks')->group(function () {
        Route::post('/', [\App\Http\Controllers\QuestionBankController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\QuestionBankController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics', [\App\Http\Controllers\QuestionBankController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{questionBank}', [\App\Http\Controllers\QuestionBankController::class, 'show'])
            ->middleware('auth:sanctum'); // Policy kontrolü var
        Route::put('/{questionBank}', [\App\Http\Controllers\QuestionBankController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{questionBank}', [\App\Http\Controllers\QuestionBankController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/prepare-booklet', [\App\Http\Controllers\QuestionBankController::class, 'prepareBooklet'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::post('/prepare-practice-test', [\App\Http\Controllers\QuestionBankController::class, 'preparePracticeTest'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::post('/prepare-topic-test', [\App\Http\Controllers\QuestionBankController::class, 'prepareTopicTest'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/{questionBank}/check-reuse', [\App\Http\Controllers\QuestionBankController::class, 'checkReuse'])
            ->middleware('auth:sanctum');
        Route::post('/{questionBank}/record-usage', [\App\Http\Controllers\QuestionBankController::class, 'recordUsage'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Guardian Portal (Veli Portalı) (with authentication)
    Route::prefix('portal/guardian')->middleware('auth:sanctum')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'dashboard']);
        Route::get('/students/{student}', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudent']);
        Route::get('/students/{student}/schedule', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentSchedule']);
        Route::get('/students/{student}/homework', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentHomework']);
        Route::get('/students/{student}/homework-control-report', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentHomeworkControlReport']);
        Route::get('/students/{student}/attendance', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentAttendance']);
        Route::get('/students/{student}/grades', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentGrades']);
        Route::get('/calendar', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getCalendar']);
        Route::get('/students/{student}/tutoring-sessions', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentTutoringSessions']);
        Route::get('/students/{student}/online-exams', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentOnlineExams']);
        Route::get('/students/{student}/appointments', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentAppointments']);
        Route::get('/students/{student}/guidance-notes', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentGuidanceNotes']);
        Route::get('/students/{student}/meal-menus', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentMealMenus']);
        Route::get('/students/{student}/meal-attendance', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentMealAttendance']);
        Route::get('/students/{student}/bulletins', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentBulletins']);
        Route::get('/students/{student}/activities', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentActivities']);
        Route::get('/students/{student}/surveys', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentSurveys']);
        Route::get('/students/{student}/questions', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentQuestions']);
        Route::get('/students/{student}/notifications', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'getStudentNotifications']);
        Route::post('/students/{student}/notifications/{notification}/read', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'markNotificationAsRead']);
        Route::post('/students/{student}/homeworks/{homework}/select-project-topic', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'selectProjectTopic']);
        Route::post('/change-password', [\App\Http\Controllers\Portal\GuardianPortalController::class, 'changePassword']);
    });

    // Student Portal (Öğrenci Portalı) (with authentication)
    Route::prefix('portal/student')->middleware('auth:sanctum')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Portal\StudentPortalController::class, 'dashboard']);
        Route::get('/schedule', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getSchedule']);
        Route::get('/homework', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getHomework']);
        Route::get('/homework-control-report', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getHomeworkControlReport']);
        Route::get('/attendance', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getAttendance']);
        Route::get('/grades', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getGrades']);
        Route::get('/calendar', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getCalendar']);
        Route::get('/tutoring-sessions', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getTutoringSessions']);
        Route::get('/online-exams', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getOnlineExams']);
        Route::get('/appointments', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getAppointments']);
        Route::get('/guidance-notes', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getGuidanceNotes']);
        Route::get('/meal-menus', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getMealMenus']);
        Route::get('/bulletins', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getBulletins']);
        Route::get('/activities', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getActivities']);
        Route::get('/surveys', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getSurveys']);
        Route::get('/questions', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getQuestions']);
        Route::get('/meal-attendance', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getMealAttendance']);
        Route::get('/notifications', [\App\Http\Controllers\Portal\StudentPortalController::class, 'getNotifications']);
        Route::post('/notifications/{notification}/read', [\App\Http\Controllers\Portal\StudentPortalController::class, 'markNotificationAsRead']);
        Route::post('/homeworks/{homework}/select-project-topic', [\App\Http\Controllers\Portal\StudentPortalController::class, 'selectProjectTopic']);
        Route::post('/change-password', [\App\Http\Controllers\Portal\StudentPortalController::class, 'changePassword']);
    });

    // Online Surveys (Online Anketler) (with permission checks)
    Route::prefix('online-surveys')->group(function () {
        Route::post('/', [\App\Http\Controllers\OnlineSurveyController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\OnlineSurveyController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineSurvey}', [\App\Http\Controllers\OnlineSurveyController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{onlineSurvey}', [\App\Http\Controllers\OnlineSurveyController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{onlineSurvey}', [\App\Http\Controllers\OnlineSurveyController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/questions', [\App\Http\Controllers\OnlineSurveyController::class, 'addQuestion'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::put('/questions/{onlineSurveyQuestion}', [\App\Http\Controllers\OnlineSurveyController::class, 'updateQuestion'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/questions/{onlineSurveyQuestion}', [\App\Http\Controllers\OnlineSurveyController::class, 'deleteQuestion'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/responses', [\App\Http\Controllers\OnlineSurveyController::class, 'submitResponse'])
            ->middleware('auth:sanctum'); // Herkes cevap verebilir
        Route::get('/{onlineSurvey}/statistics', [\App\Http\Controllers\OnlineSurveyController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{onlineSurvey}/analysis', [\App\Http\Controllers\OnlineSurveyController::class, 'getAnalysis'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Form Surveys (Form Anketler) (with permission checks)
    Route::prefix('form-surveys')->group(function () {
        Route::post('/', [\App\Http\Controllers\FormSurveyController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\FormSurveyController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{formSurvey}', [\App\Http\Controllers\FormSurveyController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{formSurvey}', [\App\Http\Controllers\FormSurveyController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{formSurvey}', [\App\Http\Controllers\FormSurveyController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/responses', [\App\Http\Controllers\FormSurveyController::class, 'submitResponse'])
            ->middleware('auth:sanctum'); // Herkes cevap verebilir
        Route::get('/{formSurvey}/statistics', [\App\Http\Controllers\FormSurveyController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{formSurvey}/analysis', [\App\Http\Controllers\FormSurveyController::class, 'getAnalysis'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/{formSurvey}/generate-optical-form', [\App\Http\Controllers\FormSurveyController::class, 'generateOpticalForm'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{formSurvey}/download-optical-form/{file}', [\App\Http\Controllers\FormSurveyController::class, 'downloadOpticalForm'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read')
            ->name('form-surveys.download-optical-form');
        Route::post('/{formSurvey}/generate-personnel-report-card', [\App\Http\Controllers\FormSurveyController::class, 'generatePersonnelReportCard'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{formSurvey}/download-report-card/{file}', [\App\Http\Controllers\FormSurveyController::class, 'downloadReportCard'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read')
            ->name('form-surveys.download-report-card');
    });

    // Staff Assignments (Personel Görevlendirme) (with permission checks)
    Route::prefix('staff-assignments')->group(function () {
        Route::post('/', [\App\Http\Controllers\StaffAssignmentController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\StaffAssignmentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/calendar-events', [\App\Http\Controllers\StaffAssignmentController::class, 'getCalendarEvents'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{staffAssignment}', [\App\Http\Controllers\StaffAssignmentController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{staffAssignment}', [\App\Http\Controllers\StaffAssignmentController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{staffAssignment}', [\App\Http\Controllers\StaffAssignmentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{staffAssignment}/update-completion', [\App\Http\Controllers\StaffAssignmentController::class, 'updateCompletion'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/{staffAssignment}/available-questions', [\App\Http\Controllers\StaffAssignmentController::class, 'getAvailableQuestions'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/{staffAssignment}/select-questions', [\App\Http\Controllers\StaffAssignmentController::class, 'selectQuestions'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/{staffAssignment}/selected-questions', [\App\Http\Controllers\StaffAssignmentController::class, 'getSelectedQuestions'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Achievement Certificates (Başarı Belgeleri) (with permission checks)
    Route::prefix('achievement-certificates')->group(function () {
        Route::post('/', [\App\Http\Controllers\AchievementCertificateController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\AchievementCertificateController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{achievementCertificate}', [\App\Http\Controllers\AchievementCertificateController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{achievementCertificate}', [\App\Http\Controllers\AchievementCertificateController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{achievementCertificate}', [\App\Http\Controllers\AchievementCertificateController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{achievementCertificate}/publish-to-guardian', [\App\Http\Controllers\AchievementCertificateController::class, 'publishToGuardian'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{achievementCertificate}/add-to-portfolio', [\App\Http\Controllers\AchievementCertificateController::class, 'addToPortfolio'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
    });

    // Meal Menus (Yemek Menü) (with permission checks)
    Route::prefix('meal-menus')->group(function () {
        Route::post('/', [\App\Http\Controllers\MealMenuController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\MealMenuController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{mealMenu}', [\App\Http\Controllers\MealMenuController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{mealMenu}', [\App\Http\Controllers\MealMenuController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{mealMenu}', [\App\Http\Controllers\MealMenuController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{mealMenu}/copy-to-classrooms', [\App\Http\Controllers\MealMenuController::class, 'copyToClassrooms'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/attendance', [\App\Http\Controllers\MealMenuController::class, 'recordAttendance'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/attendance/statistics', [\App\Http\Controllers\MealMenuController::class, 'getAttendanceStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Curriculum Tracking (Müfredat Takip) (with permission checks)
    Route::prefix('curriculum-tracking')->group(function () {
        Route::post('/', [\App\Http\Controllers\CurriculumTrackingController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\CurriculumTrackingController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{curriculumTracking}', [\App\Http\Controllers\CurriculumTrackingController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{curriculumTracking}', [\App\Http\Controllers\CurriculumTrackingController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{curriculumTracking}', [\App\Http\Controllers\CurriculumTrackingController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::get('/classroom/{classroomId}/list', [\App\Http\Controllers\CurriculumTrackingController::class, 'getClassroomList'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/teacher/{teacherId}/list', [\App\Http\Controllers\CurriculumTrackingController::class, 'getTeacherList'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/compare-classrooms', [\App\Http\Controllers\CurriculumTrackingController::class, 'compareClassrooms'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/topic-report', [\App\Http\Controllers\CurriculumTrackingController::class, 'getTopicReport'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Guidance Notes (Rehberlik Notları) (with permission checks)
    Route::prefix('guidance-notes')->group(function () {
        Route::post('/', [\App\Http\Controllers\GuidanceNoteController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\GuidanceNoteController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{guidanceNote}', [\App\Http\Controllers\GuidanceNoteController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{guidanceNote}', [\App\Http\Controllers\GuidanceNoteController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{guidanceNote}', [\App\Http\Controllers\GuidanceNoteController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{guidanceNote}/approve', [\App\Http\Controllers\GuidanceNoteController::class, 'approve'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/counselor/{counselorId}/statistics', [\App\Http\Controllers\GuidanceNoteController::class, 'getCounselorStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/student/{studentId}/notes', [\App\Http\Controllers\GuidanceNoteController::class, 'getStudentNotes'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Question Targets (Hedef Soru Takip) (with permission checks)
    Route::prefix('question-targets')->group(function () {
        Route::post('/', [\App\Http\Controllers\QuestionTargetController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\QuestionTargetController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{questionTarget}', [\App\Http\Controllers\QuestionTargetController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::delete('/{questionTarget}', [\App\Http\Controllers\QuestionTargetController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/record-count', [\App\Http\Controllers\QuestionTargetController::class, 'recordCount'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/statistics/student/{studentId}', [\App\Http\Controllers\QuestionTargetController::class, 'studentStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/statistics/teacher', [\App\Http\Controllers\QuestionTargetController::class, 'teacherStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Question Daily Limits (Günlük Soru Limitleri) (with permission checks)
    Route::prefix('question-daily-limits')->group(function () {
        Route::post('/', [\App\Http\Controllers\QuestionDailyLimitController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\QuestionDailyLimitController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{limit}', [\App\Http\Controllers\QuestionDailyLimitController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::delete('/{limit}', [\App\Http\Controllers\QuestionDailyLimitController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // Leads (CRM) (with permission checks)
    Route::prefix('leads')->group(function () {
        Route::post('/', [\App\Http\Controllers\LeadController::class, 'store']);
        Route::get('/', [\App\Http\Controllers\LeadController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\LeadController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\LeadController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\LeadController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Appointments (CRM) (with permission checks)
    Route::prefix('appointments')->group(function () {
        Route::post('/', [\App\Http\Controllers\AppointmentController::class, 'store']);
        Route::get('/', [\App\Http\Controllers\AppointmentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\AppointmentController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\AppointmentController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\AppointmentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Contracts (with permission checks)
    Route::prefix('contracts')->group(function () {
        Route::post('/', [\App\Http\Controllers\ContractController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\ContractController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{id}', [\App\Http\Controllers\ContractController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{id}', [\App\Http\Controllers\ContractController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{id}', [\App\Http\Controllers\ContractController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/generate-pdf', [\App\Http\Controllers\ContractController::class, 'generatePdf'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/download-pdf', [\App\Http\Controllers\ContractController::class, 'downloadPdf'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Reports
    Route::prefix('reports')->group(function () {
        Route::post('/generate', [ReportController::class, 'generate']);
        Route::get('/types', [ReportController::class, 'types']);
    });

    // Internal Messages
    Route::prefix('internal-messages')->group(function () {
        Route::post('/', [\App\Http\Controllers\InternalMessageController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\InternalMessageController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/unread-count', [\App\Http\Controllers\InternalMessageController::class, 'unreadCount'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{message}', [\App\Http\Controllers\InternalMessageController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::put('/{message}/mark-as-read', [\App\Http\Controllers\InternalMessageController::class, 'markAsRead'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.update');
        Route::delete('/{message}', [\App\Http\Controllers\InternalMessageController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // Announcements
    Route::prefix('announcements')->group(function () {
        Route::post('/', [\App\Http\Controllers\AnnouncementController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\AnnouncementController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{announcement}', [\App\Http\Controllers\AnnouncementController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::delete('/{announcement}', [\App\Http\Controllers\AnnouncementController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // Tutoring Sessions
    Route::prefix('tutoring-sessions')->group(function () {
        Route::post('/', [\App\Http\Controllers\TutoringSessionController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/', [\App\Http\Controllers\TutoringSessionController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{tutoringSession}', [\App\Http\Controllers\TutoringSessionController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{tutoringSession}', [\App\Http\Controllers\TutoringSessionController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{tutoringSession}', [\App\Http\Controllers\TutoringSessionController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
        Route::post('/{tutoringSession}/students', [\App\Http\Controllers\TutoringSessionController::class, 'addStudent'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{tutoringSession}/students', [\App\Http\Controllers\TutoringSessionController::class, 'removeStudent'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{tutoringSession}/attendance', [\App\Http\Controllers\TutoringSessionController::class, 'takeAttendance'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::post('/{tutoringSession}/attendance/bulk', [\App\Http\Controllers\TutoringSessionController::class, 'bulkAttendance'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::get('/statistics', [\App\Http\Controllers\TutoringSessionController::class, 'getStatistics'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
    });

    // Scheduled SMS
    Route::prefix('scheduled-sms')->group(function () {
        Route::post('/', [\App\Http\Controllers\ScheduledSmsController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\ScheduledSmsController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{scheduledSms}', [\App\Http\Controllers\ScheduledSmsController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::put('/{scheduledSms}/cancel', [\App\Http\Controllers\ScheduledSmsController::class, 'cancel'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.update');
        Route::delete('/{scheduledSms}', [\App\Http\Controllers\ScheduledSmsController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // SMS Reports
    Route::prefix('sms-reports')->group(function () {
        Route::get('/', [\App\Http\Controllers\SmsReportController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{smsReport}', [\App\Http\Controllers\SmsReportController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::delete('/{smsReport}', [\App\Http\Controllers\SmsReportController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // SMS Blacklist
    Route::prefix('sms-blacklist')->group(function () {
        Route::post('/', [\App\Http\Controllers\SmsBlacklistController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\SmsBlacklistController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/check', [\App\Http\Controllers\SmsBlacklistController::class, 'check'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{smsBlacklist}', [\App\Http\Controllers\SmsBlacklistController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::delete('/{smsBlacklist}', [\App\Http\Controllers\SmsBlacklistController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
    });

    // SMS Templates
    Route::prefix('sms-templates')->group(function () {
        Route::post('/', [\App\Http\Controllers\SmsTemplateController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.create');
        Route::get('/', [\App\Http\Controllers\SmsTemplateController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::get('/{smsTemplate}', [\App\Http\Controllers\SmsTemplateController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
        Route::put('/{smsTemplate}', [\App\Http\Controllers\SmsTemplateController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.update');
        Route::delete('/{smsTemplate}', [\App\Http\Controllers\SmsTemplateController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.delete');
        Route::post('/{smsTemplate}/render', [\App\Http\Controllers\SmsTemplateController::class, 'render'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':communication.read');
    });

    // Settings (with permission checks)
    Route::prefix('settings')->group(function () {
        Route::get('/', [\App\Http\Controllers\TenantSettingsController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/{key}', [\App\Http\Controllers\TenantSettingsController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/', [\App\Http\Controllers\TenantSettingsController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{key}', [\App\Http\Controllers\TenantSettingsController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Packages (SuperAdmin only)
    Route::prefix('packages')->group(function () {
        Route::get('/', [\App\Http\Controllers\PackageController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\PackageController::class, 'store']);
        Route::get('/{package}', [\App\Http\Controllers\PackageController::class, 'show']);
        Route::put('/{package}', [\App\Http\Controllers\PackageController::class, 'update']);
        Route::delete('/{package}', [\App\Http\Controllers\PackageController::class, 'destroy']);
    });

    // Subscriptions (with permission checks)
    Route::prefix('subscriptions')->group(function () {
        Route::get('/', [\App\Http\Controllers\SubscriptionController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::get('/current', [\App\Http\Controllers\SubscriptionController::class, 'current'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::post('/', [\App\Http\Controllers\SubscriptionController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.create');
        Route::get('/{subscription}', [\App\Http\Controllers\SubscriptionController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.read');
        Route::put('/{subscription}', [\App\Http\Controllers\SubscriptionController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.update');
        Route::delete('/{subscription}', [\App\Http\Controllers\SubscriptionController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':academic.delete');
    });

    // Locations (Bağımlı seçimler için)
    Route::prefix('locations')->group(function () {
        Route::get('/cities', [\App\Http\Controllers\LocationController::class, 'cities']);
        Route::get('/cities/{cityId}/districts', [\App\Http\Controllers\LocationController::class, 'districts']);
    });

    // Campuses (with permission checks)
    Route::prefix('campuses')->group(function () {
        Route::post('/', [\App\Http\Controllers\CampusController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':campuses.create');
        Route::get('/', [\App\Http\Controllers\CampusController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':campuses.read');
        Route::get('/{id}', [\App\Http\Controllers\CampusController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':campuses.read');
        Route::put('/{id}', [\App\Http\Controllers\CampusController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':campuses.update');
        Route::delete('/{id}', [\App\Http\Controllers\CampusController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':campuses.delete');
    });

    // Branches (with permission checks)
    Route::prefix('branches')->group(function () {
        Route::post('/', [\App\Http\Controllers\BranchController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':branches.create');
        Route::get('/', [\App\Http\Controllers\BranchController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':branches.read');
        Route::get('/{id}', [\App\Http\Controllers\BranchController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':branches.read');
        Route::put('/{id}', [\App\Http\Controllers\BranchController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':branches.update');
        Route::delete('/{id}', [\App\Http\Controllers\BranchController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':branches.delete');
    });

    // Education Levels (with permission checks)
    Route::prefix('education-levels')->group(function () {
        Route::post('/', [\App\Http\Controllers\EducationLevelController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.create');
        Route::get('/', [\App\Http\Controllers\EducationLevelController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.read');
        Route::get('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'show'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.read');
        Route::put('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'update'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.update');
        Route::delete('/{id}', [\App\Http\Controllers\EducationLevelController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.delete');
		Route::get('/{educationLevel}/curriculum', [\App\Http\Controllers\EducationLevelController::class, 'getCurriculum']);
		Route::post('/{educationLevel}/curriculum', [\App\Http\Controllers\EducationLevelController::class, 'updateCurriculum']);
    });

    // --- TIME SLOTS (Education Level Based) ---
    // Frontend URL: /api/v1/{educationLevelId}/time-slots
    Route::get('/{educationLevelId}/time-slots', [\App\Http\Controllers\EducationLevelTimeSlotController::class, 'index'])
        ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.read');

    // Frontend URL: /api/v1/time-slots (POST için ID URL'de değil, body'de gelir)
    Route::post('/time-slots', [\App\Http\Controllers\EducationLevelTimeSlotController::class, 'store'])
        ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.update');

    // Frontend URL: /api/v1/time-slots/{id}
    Route::delete('/time-slots/{id}', [\App\Http\Controllers\EducationLevelTimeSlotController::class, 'destroy'])
        ->middleware(\App\Http\Middleware\CheckPermission::class . ':education_levels.update');


    // User Assignments (Kullanıcı Atamaları) (with permission checks)
    Route::prefix('user-assignments')->group(function () {
        Route::get('/', [\App\Http\Controllers\UserAssignmentController::class, 'index'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.read');
        Route::post('/', [\App\Http\Controllers\UserAssignmentController::class, 'store'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.create');
        Route::post('/sync', [\App\Http\Controllers\UserAssignmentController::class, 'sync'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.update');
        Route::delete('/{id}', [\App\Http\Controllers\UserAssignmentController::class, 'destroy'])
            ->middleware(\App\Http\Middleware\CheckPermission::class . ':users.delete');
    });

    // Mobile API Routes (Mobil uygulama için özel endpoint'ler)
    Route::prefix('mobile/v1')->group(function () {
        // Mobil özel endpoint'ler buraya eklenecek
        // Şimdilik mevcut endpoint'ler mobil uyumlu
    });

    // Other routes will be added here
});