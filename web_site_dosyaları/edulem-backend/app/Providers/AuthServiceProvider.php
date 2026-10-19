<?php

namespace App\Providers;

use App\Models\AcademicYear;
use App\Models\Appointment;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Contract;
use App\Models\DutySchedule;
use App\Models\Exam;
use App\Models\ExamAchievement;
use App\Models\ExamScoreCoefficient;
use App\Models\ExamTopic;
use App\Models\Expense;
use App\Models\Grade;
use App\Models\GradeAchievement;
use App\Models\GradeTopic;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Installment;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Lesson;
use App\Models\Payment;
use App\Models\Package;
use App\Models\InternalMessage;
use App\Models\Announcement;
use App\Models\ScheduledSms;
use App\Models\SmsReport;
use App\Models\SmsBlacklist;
use App\Models\SmsTemplate;
use App\Models\TutoringSession;
use App\Models\ExamClassroom;
use App\Models\Question;
use App\Models\QuestionTarget;
use App\Models\StudentQuestionCount;
use App\Models\OnlineExam;
use App\Models\ScholarshipExam;
use App\Models\OnlineSurvey;
use App\Models\OnlineSurveyQuestion;
use App\Models\OnlineSurveyResponse;
use App\Models\CalendarEvent;
use App\Models\CalendarEventParticipant;
use App\Models\QuestionBankTopic;
use App\Models\QuestionBank;
use App\Models\GuidanceNote;
use App\Models\Activity;
use App\Models\CurriculumTracking;
use App\Models\MealMenu;
use App\Models\MealAttendance;
use App\Models\BulletinTemplate;
use App\Models\Bulletin;
use App\Models\AchievementCertificate;
use App\Models\StaffAssignment;
use App\Models\QuestionDailyLimit;
use App\Models\ReportCardTemplate;
use App\Models\Schedule;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Subscription;
use App\Policies\AcademicYearPolicy;
use App\Policies\AppointmentPolicy;
use App\Policies\AttendancePolicy;
use App\Policies\ClassroomPolicy;
use App\Policies\ContractPolicy;
use App\Policies\DutySchedulePolicy;
use App\Policies\ExamPolicy;
use App\Policies\ExamScoreCoefficientPolicy;
use App\Policies\ExamTopicPolicy;
use App\Policies\ExpensePolicy;
use App\Policies\GradePolicy;
use App\Policies\GradeTopicPolicy;
use App\Policies\HomeworkPolicy;
use App\Policies\HomeworkSubmissionPolicy;
use App\Policies\InstallmentPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\LeadPolicy;
use App\Policies\LessonPolicy;
use App\Policies\PackagePolicy;
use App\Policies\PaymentPolicy;
use App\Policies\InternalMessagePolicy;
use App\Policies\AnnouncementPolicy;
use App\Policies\ScheduledSmsPolicy;
use App\Policies\SmsReportPolicy;
use App\Policies\SmsBlacklistPolicy;
use App\Policies\SmsTemplatePolicy;
use App\Policies\TutoringSessionPolicy;
use App\Policies\ExamClassroomPolicy;
use App\Policies\QuestionDailyLimitPolicy;
use App\Policies\QuestionPolicy;
use App\Policies\QuestionTargetPolicy;
use App\Policies\StudentQuestionCountPolicy;
use App\Policies\OnlineExamPolicy;
use App\Policies\ScholarshipExamPolicy;
use App\Policies\ReportCardTemplatePolicy;
use App\Policies\FormSurveyPolicy;
use App\Policies\FormSurveyResponsePolicy;
use App\Policies\OnlineSurveyPolicy;
use App\Policies\OnlineSurveyResponsePolicy;
use App\Policies\CalendarEventPolicy;
use App\Policies\QuestionBankTopicPolicy;
use App\Policies\QuestionBankPolicy;
use App\Policies\SchedulePolicy;
use App\Policies\SettingPolicy;
use App\Policies\SubscriptionPolicy;
use App\Policies\StudentPolicy;
use App\Policies\GuidanceNotePolicy;
use App\Policies\ActivityPolicy;
use App\Policies\CurriculumTrackingPolicy;
use App\Policies\MealMenuPolicy;
use App\Policies\MealAttendancePolicy;
use App\Policies\BulletinTemplatePolicy;
use App\Policies\BulletinPolicy;
use App\Policies\AchievementCertificatePolicy;
use App\Policies\StaffAssignmentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        AcademicYear::class => AcademicYearPolicy::class,
        Student::class => StudentPolicy::class,
        Payment::class => PaymentPolicy::class,
        Installment::class => InstallmentPolicy::class,
        Invoice::class => InvoicePolicy::class,
        Expense::class => ExpensePolicy::class,
        Classroom::class => ClassroomPolicy::class,
        Lesson::class => LessonPolicy::class,
        Schedule::class => SchedulePolicy::class,
        DutySchedule::class => DutySchedulePolicy::class,
        Attendance::class => AttendancePolicy::class,
        Homework::class => HomeworkPolicy::class,
        HomeworkSubmission::class => HomeworkSubmissionPolicy::class,
        Exam::class => ExamPolicy::class,
        ExamScoreCoefficient::class => ExamScoreCoefficientPolicy::class,
        ExamTopic::class => ExamTopicPolicy::class,
        ExamAchievement::class => ExamTopicPolicy::class, // Aynı policy kullanılabilir
        ReportCardTemplate::class => ReportCardTemplatePolicy::class,
        Grade::class => GradePolicy::class,
        GradeTopic::class => GradeTopicPolicy::class,
        GradeAchievement::class => GradeTopicPolicy::class, // Aynı policy kullanılabilir
        Question::class => QuestionPolicy::class,
        QuestionDailyLimit::class => QuestionDailyLimitPolicy::class,
        InternalMessage::class => InternalMessagePolicy::class,
        Announcement::class => AnnouncementPolicy::class,
        ScheduledSms::class => ScheduledSmsPolicy::class,
        SmsReport::class => SmsReportPolicy::class,
        SmsBlacklist::class => SmsBlacklistPolicy::class,
        SmsTemplate::class => SmsTemplatePolicy::class,
        TutoringSession::class => TutoringSessionPolicy::class,
        ExamClassroom::class => ExamClassroomPolicy::class,
        QuestionTarget::class => QuestionTargetPolicy::class,
        StudentQuestionCount::class => StudentQuestionCountPolicy::class,
        OnlineExam::class => OnlineExamPolicy::class,
        ScholarshipExam::class => ScholarshipExamPolicy::class,
        GuidanceNote::class => GuidanceNotePolicy::class,
        Activity::class => ActivityPolicy::class,
        CurriculumTracking::class => CurriculumTrackingPolicy::class,
        MealMenu::class => MealMenuPolicy::class,
        MealAttendance::class => MealAttendancePolicy::class,
        BulletinTemplate::class => BulletinTemplatePolicy::class,
        Bulletin::class => BulletinPolicy::class,
        AchievementCertificate::class => AchievementCertificatePolicy::class,
        StaffAssignment::class => StaffAssignmentPolicy::class,
        FormSurvey::class => FormSurveyPolicy::class,
        FormSurveyResponse::class => FormSurveyResponsePolicy::class,
        OnlineSurvey::class => OnlineSurveyPolicy::class,
        OnlineSurveyQuestion::class => OnlineSurveyPolicy::class, // Questions use same policy as survey
        OnlineSurveyResponse::class => OnlineSurveyResponsePolicy::class,
        CalendarEvent::class => CalendarEventPolicy::class,
        CalendarEventParticipant::class => CalendarEventPolicy::class, // Participants use same policy as event
        QuestionBankTopic::class => QuestionBankTopicPolicy::class,
        QuestionBank::class => QuestionBankPolicy::class,
        Lead::class => LeadPolicy::class,
        Appointment::class => AppointmentPolicy::class,
        Contract::class => ContractPolicy::class,
        Setting::class => SettingPolicy::class,
        Package::class => PackagePolicy::class,
        Subscription::class => SubscriptionPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}
