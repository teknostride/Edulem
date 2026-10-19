import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/dashboard/Home';
import FounderDashboard from './pages/dashboard/FounderDashboard';
import StudentAffairsDashboard from './pages/dashboard/StudentAffairsDashboard';
import { getDashboardRouteByRole } from './utils/roleRouting';

import Login from './pages/auth/Login';
import SuperAdminLogin from './pages/auth/SuperAdminLogin';

// Öğrenci Sayfaları
import StudentList from './pages/students/StudentList';
import StudentFormWrapper from './pages/students/StudentFormWrapper';
import StudentDetailWrapper from './pages/students/StudentDetailWrapper';
import TeacherStudentsPage from './pages/students/TeacherStudentsPage';
import TeacherMeetingsPage from './pages/teachers/meetings/TeacherMeetingsPage';
import MeetingsPage from './pages/meetings/MeetingsPage';
import TeacherMeasurement from './pages/teachers/TeacherMeasurement';
import LeadList from './pages/leads/LeadList';
import CertificateList from './pages/certificates/CertificateList';
import ContractList from './pages/contracts/ContractList';
import ScholarshipExamList from './pages/scholarship/ScholarshipExamList';
import ScholarshipApplicationList from './pages/scholarship/ScholarshipApplicationList';
import ScholarshipExamForm from './pages/scholarship/ScholarshipExamForm';
import ScholarshipExamEntryTemplates from './pages/scholarship/ScholarshipExamEntryTemplates';
import ScholarshipExamStatistics from './pages/scholarship/ScholarshipExamStatistics';
import ScholarshipExamSeating from './pages/scholarship/ScholarshipExamSeating';
import ScholarshipExamManage from './pages/scholarship/ScholarshipExamManage';
import StaffAssignmentList from './pages/staff/StaffAssignmentList';


// OMR - Ölçme Değerlendirme (Yeni Mimari)
import OmrCourses from './pages/omr/OmrCourses';
import OmrTemplates from './pages/omr/OmrTemplatesBuilder';
import OmrExams from './pages/omr/OmrExams';
import OmrExamConfigure from './pages/omr/OmrExamConfigure';
import OmrAnswerKey from './pages/omr/OmrAnswerKey';
import OmrImport from './pages/omr/OmrImport';
import ExamAnalysisPage from './pages/omr/exam-analysis/ExamAnalysisPage';
import OmrSessions from './pages/omr/OmrSessions';
import OmrReportCard from './pages/omr/OmrReportCard';
import TrialExamSeating from './pages/omr/TrialExamSeating';
import CounselingStatsPage from './pages/counseling/CounselingStatsPage';

// Kullanıcı Sayfaları
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import UserDetailWrapper from './pages/users/UserDetailWrapper';

// Profil
import Profile from './pages/profile/Profile';

// Bildirimler
import NotificationList from './pages/notifications/NotificationList';

// İletişim ve Rehberlik
import CounselingClientsPage from './pages/counseling/CounselingClientsPage';
import SmsTemplateList from './pages/sms/SmsTemplateList';
import SmsTemplateForm from './pages/sms/SmsTemplateForm';
import SmsBulkSend from './pages/sms/SmsBulkSend';
import SmsHistory from './pages/sms/SmsHistory';
import SmsApiSettings from './pages/sms/SmsApiSettings';

// Dersler
import LessonList from './pages/lessons/LessonList';

// Sınavlar
import ExamList from './pages/exams/ExamList';
import ExamForm from './pages/exams/ExamForm';
import GradeEntry from './pages/exams/GradeEntry';
import OpticalFormDefinition from './pages/exams/OpticalFormDefinition';

// Ödevler
import HomeworkList from './pages/homework/HomeworkList';
import HomeworkForm from './pages/homework/HomeworkForm';
import HomeworkControl from './pages/homework/HomeworkControl';

// Soru Bankası
import QuestionBankList from './pages/question-bank/QuestionBankList';
import QuestionBankForm from './pages/question-bank/QuestionBankForm';
import QuestionTopicList from './pages/question-bank/QuestionTopicList';
import TestGeneration from './pages/question-bank/TestGeneration';

// Müfredat Takibi
import CurriculumList from './pages/academic/CurriculumList';
import CurriculumForm from './pages/academic/CurriculumForm';

// Etüt ve Özel Ders
import TutoringList from './pages/academic/tutoring/TutoringList';
import TutoringForm from './pages/academic/tutoring/TutoringForm';
import TutoringAttendance from './pages/academic/tutoring/TutoringAttendance';
import MealMenuList from './pages/operations/MealMenuList';
import MealMenuForm from './pages/operations/MealMenuForm';
import MealAttendance from './pages/operations/MealAttendance';
import DutyScheduleList from './pages/operations/DutyScheduleList';
import DutyScheduleForm from './pages/operations/DutyScheduleForm';
import AppointmentList from './pages/operations/AppointmentList';
import AppointmentForm from './pages/operations/AppointmentForm';

// Anket ve Formlar
import SurveyList from './pages/surveys/SurveyList';
import OnlineSurveyForm from './pages/surveys/OnlineSurveyForm';
import SurveyAnalysis from './pages/surveys/SurveyAnalysis';

// İletişim ve Etkileşim
import ActivityList from './pages/communication/ActivityList';
import ActivityForm from './pages/communication/ActivityForm';
import BulletinList from './pages/communication/BulletinList';
import BulletinForm from './pages/communication/BulletinForm';
import SchoolCalendar from './pages/calendar/Calendar';

// Ayarlar Sayfaları
import InstitutionSettings from './pages/settings/institution/InstitutionSettings';
import CampusList from './pages/settings/campuses/CampusList';
import EducationLevelList from './pages/settings/education-levels/EducationLevelList';
import ClassroomList from './pages/academic/classrooms/ClassroomList';
import SeasonList from './pages/settings/seasons/SeasonList';

// Şube Sayfaları
import BranchList from './pages/branches/BranchList';
import BranchFormWrapper from './pages/branches/BranchFormWrapper';
import BranchDetailWrapper from './pages/branches/BranchDetailWrapper';

// Ders Saatleri
import TimeSlotsList from './pages/timeslots/TimeSlotsList';
import TimeSlotsForm from './pages/timeslots/TimeSlotsForm';

// Ders Programları
// import ScheduleList from './pages/schedules/ScheduleList';
import ScheduleForm from './pages/schedules/ScheduleForm';
import ScheduleWeekly from './pages/schedules/ScheduleWeekly';

// Yetkilendirme
// import PermissionManager from './pages/permissions/PermissionManager';
import RolesList from './pages/permissions/RolesList';
import PermissionsList from './pages/permissions/PermissionsList';
import CreateRole from './pages/permissions/CreateRole';
import PermissionDetail from './pages/permissions/PermissionDetail';
import RoleDetail from './pages/permissions/RoleDetail';

// Süper Admin Sayfaları
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import TenantList from './pages/super-admin/TenantList';
import TenantForm from './pages/super-admin/TenantForm';
import TenantDetail from './pages/super-admin/TenantDetail';
import ModulesCatalog from './pages/super-admin/ModulesCatalog';
import FinanceDashboard from './pages/super-admin/FinanceDashboard';
import SaasExpenses from './pages/super-admin/SaasExpenses';
import SaasStaffList from './pages/super-admin/SaasStaffList';
import PermissionRoleForm from './pages/permissions/PermissionRoleForm';

// Messages
import Messages from './pages/messages/Messages';

// Devamsızlık
import AttendanceList from './pages/attendances/AttendanceList';
import AttendanceForm from './pages/attendances/AttendanceForm';

// Ödemeler
import PaymentList from './pages/payments/PaymentList';

// Arama
// Portal
import StudentDashboard from './pages/portal/StudentDashboard';
import OnlineExamList from './pages/portal/OnlineExamList';
import OnlineExamPlayer from './pages/portal/OnlineExamPlayer';
import StudentHomeworkList from './pages/portal/StudentHomeworkList';
import StudentTutoring from './pages/portal/StudentTutoring';
import StudentSchedulePage from './pages/portal/StudentSchedulePage';
import StudentAttendancePage from './pages/portal/StudentAttendancePage';
import StudentAssessmentPage from './pages/portal/StudentAssessmentPage';
import StudentMealMenuPage from './pages/portal/StudentMealMenuPage';
import StudentAnnouncementsPage from './pages/portal/StudentAnnouncementsPage';
import StudentSurveyPortal from './pages/portal/StudentSurveyPortal';
import SearchPage from './pages/search/SearchPage';

// Finansal
import InvoiceList from './pages/financial/InvoiceList';
import ExpenseList from './pages/financial/ExpenseList';

const isManagementDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes('yonetim') || host.includes('admin') || host.includes('super');
};

// ✅ GÜVENLİK KONTROLÜ (DÜZELTİLDİ)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('ACCESS_TOKEN');

  // Eğer Token yoksa, Login'e at
  if (!token) {
    if (isManagementDomain()) {
      return <Navigate to="/super-admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Token varsa içeri al
  return children;
};

const DashboardRedirect = ({ fromDashboardPath }: { fromDashboardPath?: boolean }) => {
  if (isManagementDomain()) {
    return <Navigate to="/super-admin" replace />;
  }

  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      return u.role ?? u.role_name ?? u.role_id ?? null;
    } catch {
      return null;
    }
  })();

  const target = getDashboardRouteByRole(role);

  if (target === '/') {
    if (fromDashboardPath) {
      return <Navigate to="/" replace />;
    }
    return <Home />;
  }

  return <Navigate to={target} replace />;
};

const TeacherOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isTeacher =
    role === 'Öğretmen' ||
    role === 'Sınıf Öğretmeni' ||
    role === 'teacher' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === '5' ||
    role === '6';
  return isTeacher ? children : <Navigate to="/" replace />;
};

const AcademicTeacherOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isGuidance =
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === '6';

  const isTeacher =
    role === 'Öğretmen' ||
    role === 'Sınıf Öğretmeni' ||
    role === 'teacher' ||
    role === '5';

  return (isTeacher && !isGuidance) ? children : <Navigate to="/" replace />;
};

const NonTeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isTeacher =
    role === 'Öğretmen' ||
    role === 'Sınıf Öğretmeni' ||
    role === 'teacher' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === '5' ||
    role === '6';
  return isTeacher ? <Navigate to="/" replace /> : children;
};

const NonTeacherNonStudentAffairsRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isTeacher =
    role === 'Öğretmen' ||
    role === 'Sınıf Öğretmeni' ||
    role === 'teacher' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === '5' ||
    role === '6';
  const isStudentAffairs = role === 'Öğrenci İşleri' || role === 'student_affairs';
  return (isTeacher || isStudentAffairs) ? <Navigate to="/" replace /> : children;
};

const NonStudentAffairsRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isStudentAffairs = role === 'Öğrenci İşleri' || role === 'student_affairs';
  return isStudentAffairs ? <Navigate to="/" replace /> : children;
};

const FounderOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isFounder = role === 'owner' || role === 'Admin' || role === 'Genel Müdür';
  return isFounder ? children : <Navigate to="/" replace />;
};

const ManagerOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      return JSON.parse(localStorage.getItem('USER_DATA') || '{}').role ?? null;
    } catch {
      return null;
    }
  })();

  const isManager =
    role === 'Müdür' ||
    role === 'Müdür Yardımcısı' ||
    role === 'Kampüs Müdürü' ||
    role === 'Öğrenci İşleri' ||
    role === 'student_affairs' ||
    role === '10' ||
    role === 'Admin' ||
    role === 'owner' ||
    role === 'Genel Müdür';
  return isManager ? children : <Navigate to="/" replace />;
};

const MeasurementRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      return u.role ?? u.role_name ?? null;
    } catch {
      return null;
    }
  })();

  const isManager =
    role === 'Müdür' ||
    role === 'Müdür Yardımcısı' ||
    role === 'Kampüs Müdürü' ||
    role === 'owner' ||
    role === 'Admin' ||
    role === 'Genel Müdür' ||
    role === 'Kurucu' ||
    role === 'kurucu';
  const isStudentAffairs = role === 'Öğrenci İşleri' || role === 'student_affairs';
  const isGuidance =
    role === 'Rehberlik' ||
    role === 'guidance' ||
    role === 'Rehber Öğretmen' ||
    role === 'rehber_teacher' ||
    role === 'guidance_teacher' ||
    role === '6';

  return (isManager || isStudentAffairs || isGuidance) ? children : <Navigate to="/" replace />;
};

const CounselingRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('USER_ROLE') || (() => {
    try {
      const u = JSON.parse(localStorage.getItem('USER_DATA') || '{}');
      return u.role ?? u.role_name ?? null;
    } catch {
      return null;
    }
  })();

  const isGuidance = role === 'Rehberlik' || role === 'guidance';
  const isManager =
    role === 'Müdür' ||
    role === 'Müdür Yardımcısı' ||
    role === 'Kampüs Müdürü' ||
    role === 'owner' ||
    role === 'Admin' ||
    role === 'Genel Müdür';
  const isStudentAffairs = role === 'Öğrenci İşleri' || role === 'student_affairs';

  if (isStudentAffairs) return <Navigate to="/" replace />;
  return (isGuidance || isManager) ? children : <Navigate to="/" replace />;
};

const LoginRouteResolver = () => {
  if (isManagementDomain()) {
    return <SuperAdminLogin />;
  }
  return <Login />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* --- 1. Login Sayfaları (Layout Yok) --- */}
        <Route path="/login" element={<LoginRouteResolver />} />
        <Route path="/portal/login" element={<Navigate to="/login" replace />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />

        {/* --- 2. Online Sınav Ekranı (Layout Yok, Tam Ekran) --- */}
        <Route path="/portal/exams/:id" element={
          <ProtectedRoute>
            <OnlineExamPlayer />
          </ProtectedRoute>
        } />

        {/* --- 2. İçerideki Sayfalar (Layout Var) --- */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Ana Dashboard */}
          <Route index element={<DashboardRedirect />} />
          <Route path="dashboard" element={<DashboardRedirect fromDashboardPath />} />
          <Route path="founder/dashboard" element={<FounderOnlyRoute><FounderDashboard /></FounderOnlyRoute>} />
          <Route path="student-affairs/dashboard" element={<StudentAffairsDashboard />} />

          {/* Global Arama */}
          <Route path="search" element={<SearchPage />} />

          {/* Öğrenciler */}
          <Route path="students" element={<NonTeacherRoute><StudentList /></NonTeacherRoute>} />
          <Route path="students/create" element={<NonTeacherRoute><StudentFormWrapper /></NonTeacherRoute>} />
          <Route path="students/:id" element={<NonTeacherRoute><StudentDetailWrapper /></NonTeacherRoute>} />
          <Route path="students/:id/edit" element={<NonTeacherRoute><StudentFormWrapper /></NonTeacherRoute>} />
          <Route path="teacher/students" element={<TeacherOnlyRoute><TeacherStudentsPage /></TeacherOnlyRoute>} />
          <Route path="teacher/meetings" element={<TeacherOnlyRoute><TeacherMeetingsPage /></TeacherOnlyRoute>} />
          <Route path="teacher/measurement" element={<AcademicTeacherOnlyRoute><TeacherMeasurement /></AcademicTeacherOnlyRoute>} />
          <Route path="teacher/measurement/analytics/:examId" element={<AcademicTeacherOnlyRoute><ExamAnalysisPage /></AcademicTeacherOnlyRoute>} />
          <Route path="meetings" element={<ManagerOnlyRoute><MeetingsPage /></ManagerOnlyRoute>} />

          {/* Kullanıcı Yönetimi */}
          <Route path="users" element={<UserList />} />
          <Route path="users/create" element={<UserForm />} />
          <Route path="users/:id" element={<UserDetailWrapper />} />
          <Route path="users/:id/edit" element={<UserForm />} />

          {/* CRM & Aday Öğrenci */}
          <Route path="leads" element={<LeadList />} />

          {/* Başarı Belgeleri */}
          <Route path="certificates" element={<CertificateList />} />

          {/* Sözleşmeler */}
          <Route path="contracts" element={<ContractList />} />

          {/* Bursluluk Sınavları */}
          <Route path="scholarship/exams" element={<NonTeacherRoute><ScholarshipExamList /></NonTeacherRoute>} />
          <Route path="scholarship/exams/new" element={<NonTeacherRoute><ScholarshipExamForm /></NonTeacherRoute>} />
          <Route path="scholarship/exams/:id/edit" element={<NonTeacherRoute><ScholarshipExamForm /></NonTeacherRoute>} />
          <Route path="scholarship/exams/:examId/manage" element={<NonTeacherRoute><ScholarshipExamManage /></NonTeacherRoute>} />
          <Route path="scholarship/exams/:examId/applications" element={<NonTeacherRoute><ScholarshipApplicationList /></NonTeacherRoute>} />
          <Route path="scholarship/exams/:examId/statistics" element={<NonTeacherRoute><ScholarshipExamStatistics /></NonTeacherRoute>} />
          <Route path="scholarship/exams/:examId/seating" element={<NonTeacherRoute><ScholarshipExamSeating /></NonTeacherRoute>} />
          <Route path="scholarship/entry-templates" element={<NonTeacherRoute><ScholarshipExamEntryTemplates /></NonTeacherRoute>} />

          {/* OMR - Ölçme Değerlendirme (Yeni Mimari) */}
          <Route path="omr/courses" element={<MeasurementRoute><OmrCourses /></MeasurementRoute>} />
          <Route path="omr/templates" element={<MeasurementRoute><OmrTemplates /></MeasurementRoute>} />
          <Route path="omr/exams" element={<MeasurementRoute><OmrExams /></MeasurementRoute>} />
          <Route path="omr/trial-exams" element={<MeasurementRoute><TrialExamSeating /></MeasurementRoute>} />
          <Route path="measurement/trial-exams" element={<MeasurementRoute><TrialExamSeating /></MeasurementRoute>} />
          <Route path="omr/exams/:examId/configure" element={<MeasurementRoute><OmrExamConfigure /></MeasurementRoute>} />
          <Route path="omr/exams/:examId/answer-key" element={<MeasurementRoute><OmrAnswerKey /></MeasurementRoute>} />
          <Route path="omr/exams/:examId/import" element={<MeasurementRoute><OmrImport /></MeasurementRoute>} />
          <Route path="omr/exams/:examId/analytics" element={<MeasurementRoute><ExamAnalysisPage /></MeasurementRoute>} />
          <Route path="omr/sessions" element={<MeasurementRoute><OmrSessions /></MeasurementRoute>} />
          <Route path="omr/exams/:examId/report-card" element={<MeasurementRoute><OmrReportCard /></MeasurementRoute>} />
          <Route path="omr/sessions/:sessionId/report-card" element={<MeasurementRoute><OmrReportCard /></MeasurementRoute>} />

          {/* Personel Görev Takibi */}
          <Route path="staff/assignments" element={<StaffAssignmentList />} />

          {/* Profil */}
          <Route path="profile" element={<Profile />} />

          {/* Bildirimler */}
          <Route path="notifications-list" element={<NotificationList />} />

          {/* İletişim */}
          <Route path="notifications" element={<NotificationList />} />

          {/* Rehberlik */}
          <Route path="counseling" element={<CounselingRoute><CounselingClientsPage /></CounselingRoute>} />
          <Route path="counseling/stats" element={<ManagerOnlyRoute><CounselingStatsPage /></ManagerOnlyRoute>} />
          <Route path="counseling/sessions" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/sessions/create" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/sessions/:id/edit" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/notes" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/notes/create" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/notes/:id/edit" element={<Navigate to="/counseling" replace />} />
          <Route path="counseling/reports" element={<Navigate to="/counseling" replace />} />

          {/* Ayarlar */}
          <Route path="settings/institution" element={<NonTeacherNonStudentAffairsRoute><InstitutionSettings /></NonTeacherNonStudentAffairsRoute>} />
          <Route path="settings/campuses" element={<NonTeacherNonStudentAffairsRoute><CampusList /></NonTeacherNonStudentAffairsRoute>} />
          <Route path="settings/education-levels" element={<NonTeacherNonStudentAffairsRoute><EducationLevelList /></NonTeacherNonStudentAffairsRoute>} />
          <Route path="settings/seasons" element={<ManagerOnlyRoute><SeasonList /></ManagerOnlyRoute>} />

          {/* Akademik */}
          <Route path="academic/classrooms" element={<ClassroomList />} />
          <Route path="lessons" element={<LessonList />} />
          <Route path="academic/exams" element={<ExamList />} />
          <Route path="academic/exams/create" element={<ExamForm />} />
          <Route path="academic/exams/:id/edit" element={<ExamForm />} />
          <Route path="academic/exams/:id/grades" element={<GradeEntry />} />
          <Route path="academic/exams/:id/optical" element={<OpticalFormDefinition />} />

          {/* Ödevler */}
          <Route path="academic/homework" element={<NonStudentAffairsRoute><HomeworkList /></NonStudentAffairsRoute>} />
          <Route path="academic/homework/create" element={<NonStudentAffairsRoute><HomeworkForm /></NonStudentAffairsRoute>} />
          <Route path="academic/homework/:id/edit" element={<NonStudentAffairsRoute><HomeworkForm /></NonStudentAffairsRoute>} />
          <Route path="academic/homework/:id/control" element={<NonStudentAffairsRoute><HomeworkControl /></NonStudentAffairsRoute>} />

          {/* Soru Bankası */}
          <Route path="academic/question-bank" element={<QuestionBankList />} />
          <Route path="academic/question-bank/create" element={<QuestionBankForm />} />
          <Route path="academic/question-bank/:id/edit" element={<QuestionBankForm />} />
          <Route path="academic/question-bank/topics" element={<QuestionTopicList />} />
          <Route path="academic/question-bank/generate" element={<TestGeneration />} />

          {/* Müfredat Takibi */}
          <Route path="academic/curriculum" element={<CurriculumList />} />
          <Route path="academic/curriculum/create" element={<CurriculumForm />} />
          <Route path="academic/curriculum/:id/edit" element={<CurriculumForm />} />

          {/* Etüt ve Özel Ders */}
          <Route path="academic/tutoring" element={<TutoringList />} />
          <Route path="academic/tutoring/create" element={<TutoringForm />} />
          <Route path="academic/tutoring/:id/edit" element={<TutoringForm />} />
          <Route path="academic/tutoring/:id/attendance" element={<TutoringAttendance />} />

          {/* Kurumsal Operasyonlar */}
          <Route path="operations/meal-menus" element={<MealMenuList />} />
          <Route path="operations/meal-menus/create" element={<ManagerOnlyRoute><MealMenuForm /></ManagerOnlyRoute>} />
          <Route path="operations/meal-menus/:id/edit" element={<ManagerOnlyRoute><MealMenuForm /></ManagerOnlyRoute>} />
          <Route path="operations/meal-attendance" element={<MealAttendance />} />
          <Route path="operations/duty-schedules" element={<DutyScheduleList />} />
          <Route path="operations/duty-schedules/create" element={<ManagerOnlyRoute><DutyScheduleForm /></ManagerOnlyRoute>} />
          <Route path="operations/duty-schedules/:id/edit" element={<ManagerOnlyRoute><DutyScheduleForm /></ManagerOnlyRoute>} />
          <Route path="operations/appointments" element={<AppointmentList />} />
          <Route path="operations/appointments/create" element={<AppointmentForm />} />
          <Route path="operations/appointments/:id/edit" element={<AppointmentForm />} />

          {/* Anket ve Formlar */}
          <Route path="surveys" element={<SurveyList />} />
          <Route path="surveys/online/create" element={<OnlineSurveyForm />} />
          <Route path="surveys/online/:id/edit" element={<OnlineSurveyForm />} />
          <Route path="surveys/:type/:id/analysis" element={<SurveyAnalysis />} />

          {/* Messages */}
          <Route path="messages" element={<Messages />} />

          {/* SMS Merkezi */}
          <Route path="sms/templates" element={<SmsTemplateList />} />
          <Route path="sms/templates/create" element={<SmsTemplateForm />} />
          <Route path="sms/templates/:id/edit" element={<SmsTemplateForm />} />
          <Route path="sms/bulk-send" element={<SmsBulkSend />} />
          <Route path="sms/history" element={<SmsHistory />} />
          <Route path="sms/api-settings" element={<SmsApiSettings />} />

          {/* Ders Saatleri - düzenleme listede modal ile yapılıyor */}
          <Route path="time-slots" element={<TimeSlotsList />} />
          <Route path="time-slots/create" element={<TimeSlotsForm />} />
          <Route path="time-slots/:id/edit" element={<Navigate to="/time-slots" replace />} />

          {/* Ders Programı - sınıflara göre haftalık program */}
          <Route path="schedules" element={<ScheduleWeekly />} />
          <Route path="schedules/create" element={<ScheduleForm />} />
          <Route path="schedules/:id/edit" element={<ScheduleForm />} />

          {/* Ajanda */}
          <Route path="calendar" element={<SchoolCalendar />} />

          {/* İletişim & Etkileşim */}
          <Route path="communication/activities" element={<ActivityList />} />
          <Route path="communication/activities/create" element={<ActivityForm />} />
          <Route path="communication/activities/:id/edit" element={<ActivityForm />} />
          <Route path="communication/bulletins" element={<BulletinList />} />
          <Route path="communication/bulletins/create" element={<BulletinForm />} />
          <Route path="communication/bulletins/:id/edit" element={<BulletinForm />} />

          {/* Yetkilendirme */}
          <Route path="permissions" element={<PermissionsList />} />
          <Route path="permissions/:id" element={<PermissionDetail />} />
          <Route path="permissions/roles" element={<RolesList />} />
          <Route path="permissions/roles/:id" element={<RoleDetail />} />
          <Route path="permissions/roles/create" element={<CreateRole />} />
          <Route path="permissions/roles/:id/edit" element={<CreateRole />} />
          <Route path="permissions/users" element={<PermissionRoleForm />} />

          {/* Süper Admin & SaaS HQ */}
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          <Route path="super-admin/tenants" element={<TenantList />} />
          <Route path="super-admin/tenants/create" element={<TenantForm />} />
          <Route path="super-admin/tenants/:id" element={<TenantDetail />} />
          <Route path="super-admin/tenants/:id/edit" element={<TenantForm />} />
          <Route path="super-admin/modules" element={<ModulesCatalog />} />
          <Route path="super-admin/finance" element={<FinanceDashboard />} />
          <Route path="super-admin/expenses" element={<SaasExpenses />} />
          <Route path="super-admin/staff" element={<SaasStaffList />} />

          {/* Devamsızlık */}
          <Route path="attendances" element={<AttendanceList />} />
          <Route path="attendances/create" element={<AttendanceForm />} />

          {/* Ödemeler */}
          <Route path="payments" element={<PaymentList />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="expenses" element={<ExpenseList />} />

          {/* Şubeler */}
          <Route path="branches" element={<BranchList />} />
          <Route path="branches/create" element={<BranchFormWrapper />} />
          <Route path="branches/:id" element={<BranchDetailWrapper />} />
          <Route path="branches/:id/edit" element={<BranchFormWrapper />} />

          {/* Student Portal */}
          <Route path="portal/dashboard" element={<StudentDashboard />} />
          <Route path="portal/schedule" element={<StudentSchedulePage />} />
          <Route path="portal/assessment" element={<StudentAssessmentPage />} />
          <Route path="portal/assessment/analytics/:examId" element={<ExamAnalysisPage />} />
          <Route path="portal/attendance" element={<StudentAttendancePage />} />
          <Route path="portal/exams" element={<OnlineExamList />} />
          <Route path="portal/homework" element={<StudentHomeworkList />} />
          <Route path="portal/meal-menus" element={<StudentMealMenuPage />} />
          <Route path="portal/announcements" element={<StudentAnnouncementsPage />} />
          <Route path="portal/tutoring" element={<StudentTutoring />} />
          <Route path="portal/surveys" element={<StudentSurveyPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;