import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/login_page.dart';
import 'features/auth/register_page.dart';
import 'features/auth/splash_page.dart';
import 'features/profile/profile_page.dart';
import 'features/announcements/announcement_detail_page.dart';
import 'features/announcements/announcement_form_page.dart';
import 'features/announcements/announcements_list_page.dart';
import 'features/dashboard/dashboard_page.dart';
import 'features/dashboard/admin_dashboard_page.dart';
import 'features/dashboard/teacher_dashboard_page.dart';
import 'features/dashboard/student_dashboard_page.dart';
import 'features/messages/chat_page.dart';
import 'features/messages/conversation_detail_page.dart';
import 'features/messages/conversations_list_page.dart';
import 'features/messages/user_selection_page.dart';
import 'features/conversations/counseling_page.dart';
import 'features/conversations/my_conversations_page.dart';
import 'features/conversations/conversation_form_page.dart';
import 'features/conversations/admin_meetings_page.dart';
import 'features/notifications/notifications_list_page.dart';
import 'features/files/file_detail_page.dart';
import 'features/files/files_list_page.dart';
import 'features/attendances/attendances_daily_page.dart';
import 'features/attendances/attendances_stats_page.dart';
import 'features/attendances/attendances_take_page.dart';
import 'features/homework/homework_detail_page.dart';
import 'features/homework/homework_control_page.dart';
import 'features/homework/homework_form_page.dart';
import 'features/homework/homework_list_page.dart';
import 'features/assessment/student_assessment_page.dart';
import 'features/exams/exam_analysis_page.dart';
import 'features/exams/exam_detail_page.dart';
import 'features/exams/exam_form_page.dart';
import 'features/exams/exams_list_page.dart';
import 'features/grades/grade_detail_page.dart';
import 'features/grades/grades_list_page.dart';
import 'features/measurement/measurement_list_page.dart';
import 'features/measurement/measurement_session_detail_page.dart';
import 'features/scholarship/scholarship_list_page.dart';
import 'features/scholarship/scholarship_form_page.dart';
import 'features/students/student_detail_page.dart';
import 'features/students/student_form_page.dart';
import 'features/students/students_list_page.dart';
import 'features/users/user_detail_page.dart';
import 'features/users/user_form_page.dart';
import 'features/users/users_list_page.dart';
import 'features/search/global_search_page.dart';
import 'features/roles/roles_list_page.dart';
import 'features/permissions/permissions_list_page.dart';
import 'features/classrooms/classrooms_list_page.dart';
import 'features/academic_years/academic_years_list_page.dart';
import 'features/campuses/campuses_list_page.dart';
import 'features/education_levels/education_levels_list_page.dart';
import 'features/lessons/lessons_list_page.dart';
import 'features/lessons/lesson_detail_page.dart';
import 'features/lessons/lesson_form_page.dart';
import 'features/internal_messages/internal_messages_list_page.dart';
import 'features/activities/activities_list_page.dart';
import 'features/bulletins/bulletins_list_page.dart';
import 'features/bulletins/bulletin_form_page.dart';
import 'features/calendar_events/calendar_events_list_page.dart';
import 'features/schedule/schedule_list_page.dart';
import 'features/surveys/surveys_list_page.dart';
import 'features/surveys/survey_detail_page.dart';
import 'features/surveys/survey_analysis_page.dart';
import 'features/tenant/tenant_info_page.dart';
import 'features/meals/meal_menu_page.dart';
import 'features/duty_schedules/duty_schedule_page.dart';
import 'features/tutoring/tutoring_pages.dart';
import 'features/tutoring/tutoring_form_page.dart';
import 'features/tutoring/tutoring_attendance_page.dart';
import 'features/sms/sms_history_page.dart';
import 'features/sms/sms_bulk_send_page.dart';
import 'features/sms/sms_templates_page.dart';
import 'features/sms/sms_api_settings_page.dart';

import 'navigation/app_navigation_history.dart';

class AppRouter {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static GoRouter createRouter() {
    final router = GoRouter(
      navigatorKey: navigatorKey,
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (context, state) => const SplashPage()),
        GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardPage(),
        ),
        GoRoute(
          path: '/dashboard/admin',
          builder: (context, state) => const AdminDashboardPage(),
        ),
        GoRoute(
          path: '/dashboard/teacher',
          builder: (context, state) => const TeacherDashboardPage(),
        ),
        GoRoute(
          path: '/dashboard/guardian',
          builder: (context, state) => const StudentDashboardPage(),
        ),
        GoRoute(
          path: '/dashboard/student',
          builder: (context, state) => const StudentDashboardPage(),
        ),
        GoRoute(
          path: '/announcements',
          builder: (context, state) => const AnnouncementsListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const AnnouncementFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return AnnouncementDetailPage(id: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/users',
          builder: (context, state) => const UsersListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const UserFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return UserDetailPage(id: id);
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return UserFormPage(userId: id);
                  },
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/students',
          builder: (context, state) => const StudentsListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const StudentFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return StudentDetailPage(id: id);
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return StudentFormPage(studentId: id);
                  },
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/messages',
          builder: (context, state) => const ConversationsListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const UserSelectionPage(),
            ),
            GoRoute(
              path: 'chat/:id',
              builder: (context, state) {
                final userId = int.parse(state.pathParameters['id']!);
                final userData = state.extra as Map<String, dynamic>?;
                return ChatPage(userId: userId, userData: userData);
              },
            ),
            GoRoute(
              path: 'conversations/:id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return ConversationDetailPage(conversationId: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/notifications',
          builder: (context, state) => const NotificationsListPage(),
        ),
        GoRoute(
          path: '/files',
          builder: (context, state) => const FilesListPage(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return FileDetailPage(id: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/attendances',
          builder: (context, state) => const AttendancesDailyPage(),
          routes: [
            GoRoute(
              path: 'daily',
              builder: (context, state) => const AttendancesDailyPage(),
            ),
            GoRoute(
              path: 'take',
              builder: (context, state) {
                final date = state.uri.queryParameters['date'];
                return AttendancesTakePage(initialDate: date);
              },
            ),
            GoRoute(
              path: 'take/:scheduleId',
              builder: (context, state) {
                final scheduleId = int.tryParse(
                  state.pathParameters['scheduleId'] ?? '',
                );
                final date = state.uri.queryParameters['date'];
                return AttendancesTakePage(
                  initialScheduleId: scheduleId,
                  initialDate: date,
                );
              },
            ),
            GoRoute(
              path: 'stats',
              builder: (context, state) => const AttendancesStatsPage(),
            ),
          ],
        ),
        GoRoute(
          path: '/homework',
          builder: (context, state) => const HomeworkListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const HomeworkFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                final extra = state.extra is Map<String, dynamic>
                    ? state.extra as Map<String, dynamic>
                    : null;
                return HomeworkDetailPage(id: id, initialData: extra);
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return HomeworkFormPage(homeworkId: id > 0 ? id : null);
                  },
                ),
                GoRoute(
                  path: 'control',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return HomeworkControlPage(homeworkId: id);
                  },
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/meal-menus',
          builder: (context, state) => const MealMenuPage(),
        ),
        GoRoute(
          path: '/duty-schedules',
          builder: (context, state) => const DutySchedulePage(),
        ),
        GoRoute(
          path: '/tutoring',
          builder: (context, state) => const TutoringListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const TutoringFormPage(),
            ),
            GoRoute(
              path: ':id/edit',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                return TutoringFormPage(tutoringId: id > 0 ? id : null);
              },
            ),
            GoRoute(
              path: ':id/attendance',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                return TutoringAttendancePage(sessionId: id);
              },
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? 0;
                return TutoringAttendancePage(sessionId: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/meetings',
          builder: (context, state) => const AdminMeetingsPage(),
        ),
        GoRoute(
          path: '/my-conversations',
          builder: (context, state) => const MyConversationsPage(),
        ),
        GoRoute(
          path: '/conversations',
          builder: (context, state) => const CounselingPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) {
                final extra = state.extra;
                if (extra is Map) {
                  if (extra.containsKey('meetingId')) {
                    return ConversationFormPage(
                      meetingId: extra['meetingId'] as int?,
                    );
                  }
                  if (extra.containsKey('initialRecord')) {
                    return ConversationFormPage(
                      initialRecord:
                          extra['initialRecord'] as Map<String, dynamic>?,
                      initialType: extra['initialType'] as String?,
                    );
                  }
                  return ConversationFormPage(
                    initialRecord: Map<String, dynamic>.from(extra),
                    initialType: extra['initialType'] as String?,
                  );
                }
                final initialType = extra is String ? extra : 'meeting';
                return ConversationFormPage(initialType: initialType);
              },
            ),
            // Spesifik route'lar wildcard :id'den ÖNCE olmalı
            GoRoute(
              path: 'students',
              builder: (context, state) => Scaffold(
                appBar: AppBar(title: const Text('Öğrenci Görüşmeleri')),
                body: const Center(
                  child: Text('Öğrenci Görüşmeleri - Yakında'),
                ),
              ),
            ),
            GoRoute(
              path: 'parents',
              builder: (context, state) => Scaffold(
                appBar: AppBar(title: const Text('Veli Görüşmeleri')),
                body: const Center(child: Text('Veli Görüşmeleri - Yakında')),
              ),
            ),
            GoRoute(
              path: 'reports',
              builder: (context, state) => Scaffold(
                appBar: AppBar(title: const Text('Raporlar')),
                body: const Center(child: Text('Raporlar - Yakında')),
              ),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return Scaffold(
                  appBar: AppBar(title: const Text('Görüşme Detayı')),
                  body: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.construction,
                          size: 64,
                          color: Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Görüşme Detayı',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text('Bu özellik yakında kullanıma açılacak'),
                        const SizedBox(height: 16),
                        Text('ID: $id'),
                      ],
                    ),
                  ),
                );
              },
            ),
            GoRoute(
              path: ':id/edit',
              builder: (context, state) {
                return const Scaffold(
                  body: Center(child: Text('Görüşme Düzenle - Yakında')),
                );
              },
            ),
          ],
        ),
        GoRoute(
          path: '/assessment',
          builder: (context, state) => const StudentAssessmentPage(),
        ),
        GoRoute(
          path: '/exams',
          builder: (context, state) => const ExamsListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const ExamFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return ExamDetailPage(id: id);
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return ExamFormPage(examId: id);
                  },
                ),
                GoRoute(
                  path: 'analysis',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return ExamAnalysisPage(examId: id);
                  },
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/search',
          builder: (context, state) => const GlobalSearchPage(),
        ),
        GoRoute(
          path: '/measurement',
          builder: (context, state) => const MeasurementListPage(),
          routes: [
            GoRoute(
              path: 'session/:id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return MeasurementSessionDetailPage(sessionId: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/scholarship/exams',
          builder: (context, state) => const ScholarshipListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const ScholarshipFormPage(),
            ),
            GoRoute(
              path: ':id/edit',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return ScholarshipFormPage(examId: id > 0 ? id : null);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/grades',
          builder: (context, state) => const GradesListPage(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return GradeDetailPage(id: id);
              },
            ),
          ],
        ),
        GoRoute(
          path: '/roles',
          builder: (context, state) => const RolesListPage(),
        ),
        GoRoute(
          path: '/permissions',
          builder: (context, state) => const PermissionsListPage(),
        ),
        GoRoute(
          path: '/classrooms',
          builder: (context, state) => const ClassroomsListPage(),
        ),
        GoRoute(
          path: '/academic-years',
          builder: (context, state) => const AcademicYearsListPage(),
        ),
        GoRoute(
          path: '/campuses',
          builder: (context, state) => const CampusesListPage(),
        ),
        GoRoute(
          path: '/education-levels',
          builder: (context, state) => const EducationLevelsListPage(),
        ),
        GoRoute(
          path: '/lessons',
          builder: (context, state) => const LessonsListPage(),
          routes: [
            GoRoute(
              path: 'new',
              builder: (context, state) => const LessonFormPage(),
            ),
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return LessonDetailPage(id: id);
              },
              routes: [
                GoRoute(
                  path: 'edit',
                  builder: (context, state) {
                    final id =
                        int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                    return LessonFormPage(lessonId: id);
                  },
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/internal-messages',
          builder: (context, state) => const InternalMessagesListPage(),
        ),
        GoRoute(
          path: '/activities',
          builder: (context, state) => const ActivitiesListPage(),
        ),
        GoRoute(
          path: '/bulletins',
          builder: (context, state) => const BulletinsListPage(),
        ),
        GoRoute(
          path: '/bulletins/new',
          builder: (context, state) => const BulletinFormPage(),
        ),
        GoRoute(
          path: '/bulletins/:id',
          builder: (context, state) {
            final id = int.tryParse(state.pathParameters['id'] ?? '0') ?? 0;
            return BulletinFormPage(id: id);
          },
        ),
        GoRoute(
          path: '/calendar-events',
          builder: (context, state) => const CalendarEventsListPage(),
        ),
        GoRoute(
          path: '/schedule',
          builder: (context, state) => const ScheduleListPage(),
        ),
        GoRoute(
          path: '/surveys',
          builder: (context, state) => const SurveysListPage(),
          routes: [
            GoRoute(
              path: ':id',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return SurveyDetailPage(surveyId: id);
              },
            ),
            GoRoute(
              path: 'online/:id/analysis',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return SurveyAnalysisPage(surveyId: id, type: 'online');
              },
            ),
            GoRoute(
              path: 'forms/:id/analysis',
              builder: (context, state) {
                final id = int.tryParse(state.pathParameters['id'] ?? '') ?? -1;
                return SurveyAnalysisPage(surveyId: id, type: 'forms');
              },
            ),
          ],
        ),
        GoRoute(
          path: '/tenant/info',
          builder: (context, state) => const TenantInfoPage(),
        ),
        GoRoute(
          path: '/sms/history',
          builder: (context, state) => const SmsHistoryPage(),
        ),
        GoRoute(
          path: '/sms/bulk-send',
          builder: (context, state) => const SmsBulkSendPage(),
        ),
        GoRoute(
          path: '/sms/templates',
          builder: (context, state) => const SmsTemplatesPage(),
        ),
        GoRoute(
          path: '/sms/api-settings',
          builder: (context, state) => const SmsApiSettingsPage(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterPage(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfilePage(),
        ),
      ],
    );

    // Track every navigation to build the back-history stack
    router.routerDelegate.addListener(() {
      final location =
          router.routerDelegate.currentConfiguration.uri.toString();
      AppNavigationHistory.instance.recordLocation(location);
    });

    return router;
  }
}
