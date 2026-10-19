import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client_provider.dart';
import '../../core/utils/role_utils.dart';
import '../auth/auth_providers.dart';
import '../classrooms/classrooms_repository.dart';
import '../profile/profile_providers.dart';
import 'schedule_repository.dart';

final scheduleRepositoryProvider = Provider<ScheduleRepository>((ref) {
  final api = ref.read(apiClientProvider);
  return ScheduleRepository(api);
});

// Filtre provider'ları (sadece yönetim/öğretmen için)
final scheduleCampusFilterProvider = StateProvider<int?>((ref) => null);
final scheduleEducationLevelFilterProvider = StateProvider<int?>((ref) => null);
final scheduleClassroomFilterProvider = StateProvider<int?>((ref) => null);
final scheduleTeacherFilterProvider = StateProvider<int?>((ref) => null);

// Filtrelenmiş sınıf listesi (kampüs ve kademe bazlı)
final filteredClassroomsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final rawCampusId = ref.watch(scheduleCampusFilterProvider);
  final rawEducationLevelId = ref.watch(scheduleEducationLevelFilterProvider);
  final campusId = (rawCampusId == null || rawCampusId == 0)
      ? null
      : rawCampusId;
  final educationLevelId =
      (rawEducationLevelId == null || rawEducationLevelId == 0)
      ? null
      : rawEducationLevelId;
  final api = ref.read(apiClientProvider);
  final repo = ClassroomsRepository(api);

  return repo.list(
    campusId: campusId,
    educationLevelId: educationLevelId,
    perPage: 100,
  );
});

int? _asInt(dynamic v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString().trim());
}

// Rol bazlı schedule provider
final scheduleListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  final repo = ref.read(scheduleRepositoryProvider);
  final session = ref.watch(authSessionProvider);
  final profile = ref.watch(profileProvider);
  // Tüm watch çağrıları üst seviyede olmalı
  final rawSelectedClassroom = ref.watch(scheduleClassroomFilterProvider);
  final rawSelectedTeacher = ref.watch(scheduleTeacherFilterProvider);
  final selectedClassroom =
      (rawSelectedClassroom == null || rawSelectedClassroom == 0)
      ? null
      : rawSelectedClassroom;
  final selectedTeacher =
      (rawSelectedTeacher == null || rawSelectedTeacher == 0)
      ? null
      : rawSelectedTeacher;

  final userRole = session.valueOrNull?.role.toLowerCase() ?? '';
  final profileData = profile.valueOrNull;
  final userId = _asInt(profileData?['id']);

  final isStudent = isStudentRole(userRole) ||
      userRole.contains('student') ||
      userRole.contains('ogrenci') ||
      userRole.contains('öğrenci') ||
      profileData?['is_student'] == true ||
      profileData?['role'] == 'student';

  // Öğrenci: Web sitesiyle aynı portal endpoint'ini kullan
  if (isStudent) {
    return repo.listForStudentPortal();
  }

  // Öğretmen: Sadece kendi programı
  if (userRole.contains('teacher') ||
      userRole.contains('ogretmen') ||
      userRole.contains('öğretmen') ||
      userRole.contains('rehber')) {
    // Öğretmenin kendi programı (API client-side filtreleme de yap)
    if (userId != null) {
      final allSchedules = await repo.listForTeacher(userId);
      // Backend teacher_id filtresini göz ardı ederse client-side filtrele
      return allSchedules.where((s) {
        final scheduleTeacherId =
            _asInt(s['teacher_id']) ?? 0;
        if (scheduleTeacherId == userId) return true;

        final teacher = s['teacher'];
        if (teacher is Map) {
          final tId = _asInt(teacher['id']) ?? 0;
          if (tId == userId) return true;
        }

        // 2. ve 3. öğretmen kontrolü (assistant_teacher_ids)
        final assistantIds = s['assistant_teacher_ids'];
        if (assistantIds is List) {
          if (assistantIds.any(
            (id) => _asInt(id) == userId,
          )) {
            return true;
          }
        }

        // assistant_teachers objeleri kontrolü
        final assistantTeachers = s['assistant_teachers'];
        if (assistantTeachers is List) {
          if (assistantTeachers.any(
            (t) =>
                t is Map &&
                _asInt(t['id']) == userId,
          )) {
            return true;
          }
        }

        return false;
      }).toList();
    }

    return [];
  }

  // Yönetim: Sınıf seçilmediyse boş döndür (UI'da 'sınıf seçin' mesajı göster)
  if (selectedClassroom == null) {
    return [];
  }
  return repo.listAll(
    classroomId: selectedClassroom,
    teacherId: selectedTeacher,
  );
});

// Sayfa başlığı için rol provider'ı
final schedulePageTitleProvider = Provider<String>((ref) {
  final session = ref.watch(authSessionProvider);
  final profile = ref.watch(profileProvider);
  final userRole = session.valueOrNull?.role.toLowerCase() ?? '';
  final profileData = profile.valueOrNull;

  final isStudent = isStudentRole(userRole) ||
      userRole.contains('student') ||
      userRole.contains('ogrenci') ||
      userRole.contains('öğrenci') ||
      profileData?['is_student'] == true ||
      profileData?['role'] == 'student';

  if (isStudent) {
    return 'Ders Programım';
  }

  if (userRole.contains('teacher') ||
      userRole.contains('ogretmen') ||
      userRole.contains('öğretmen') ||
      userRole.contains('rehber')) {
    return 'Ders Programım';
  }

  return 'Ders Programı';
});

// Kullanıcının düzenleme yetkisi var mı?
final canEditScheduleProvider = Provider<bool>((ref) {
  final session = ref.watch(authSessionProvider);
  final userRole = session.valueOrNull?.role.toLowerCase() ?? '';

  // Öğrenci: Sadece kendi sınıfının programları düzenleyebilir
  return userRole.contains('admin') ||
      userRole.contains('owner') ||
      userRole.contains('mudur') ||
      userRole.contains('müdür') ||
      userRole.contains('manager');
});

// Kullanıcının filtre görme yetkisi var mı?
final canFilterScheduleProvider = Provider<bool>((ref) {
  final session = ref.watch(authSessionProvider);
  final userRole = session.valueOrNull?.role.toLowerCase() ?? '';

  // Sadece yönetim filtre görebilir
  return userRole.contains('admin') ||
      userRole.contains('owner') ||
      userRole.contains('mudur') ||
      userRole.contains('müdür') ||
      userRole.contains('manager');
});
