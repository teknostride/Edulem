/// Kullanıcı rollerini tutarlı ve hatasız bir şekilde sınıflandırmak için yardımcı fonksiyonlar.
///
/// ÖNEMLİ: "Öğrenci İşleri" (student_affairs) gibi personel/yönetim rolleri,
/// isminde "öğrenci" veya "student" kelimesi geçse dahi ASLA bir öğrenci rolü değildir;
/// idari bir personel (staff) rolüdür.
library;

/// Kullanıcının personel, yönetici veya idari bir role sahip olup olmadığını kontrol eder.
bool isStaffOrAdminRole(String? role) {
  if (role == null || role.trim().isEmpty) return false;
  final r = role.toLowerCase().trim();

  return r.contains('admin') ||
      r.contains('kurucu') ||
      r.contains('owner') ||
      r.contains('founder') ||
      r.contains('superadmin') ||
      r.contains('mudur') ||
      r.contains('müdür') ||
      r.contains('student_affairs') ||
      r.contains('student affairs') ||
      r.contains('öğrenci işleri') ||
      r.contains('ogrenci isleri') ||
      r.contains('öğrenci_işleri') ||
      r.contains('ogrenci_isleri') ||
      r.contains('personel') ||
      r.contains('memur') ||
      r.contains('muhasebe') ||
      r.contains('sekreter') ||
      r.contains('danışma') ||
      r.contains('danisma') ||
      r.contains('koç') ||
      r.contains('koc') ||
      r.contains('coach') ||
      r.contains('staff') ||
      r.contains('manager');
}

/// Kullanıcının portal öğrencisi olup olmadığını kontrol eder.
/// "Öğrenci İşleri" vb. personel rolleri hariç tutulur.
bool isStudentRole(String? role) {
  if (role == null || role.trim().isEmpty) return false;
  final r = role.toLowerCase().trim();

  // Personel/yönetici rollerinde "öğrenci" geçse bile öğrenci değildir
  if (isStaffOrAdminRole(r)) return false;

  return r == 'student' ||
      r == 'ogrenci' ||
      r == 'öğrenci' ||
      r == 'portal_student' ||
      r == 'guardian' ||
      r == 'parent' ||
      r == 'veli' ||
      r == 'portal_guardian';
}

/// Veli portalı kaldırıldığı için her zaman false döner (uyumluluk için korundu).
bool isGuardianRole(String? role) {
  return false;
}

/// Kullanıcının öğretmen veya rehberlik öğretmeni olup olmadığını kontrol eder.
bool isTeacherRole(String? role) {
  if (role == null || role.trim().isEmpty) return false;
  final r = role.toLowerCase().trim();

  return r.contains('teacher') ||
      r.contains('ogretmen') ||
      r.contains('öğretmen') ||
      r.contains('sinif ogretmeni') ||
      r.contains('sınıf öğretmeni') ||
      r.contains('rehber') ||
      r == '5' ||
      r == '6';
}

/// Rol için gidilmesi gereken dashboard rotasını belirler.
String getDashboardRouteForRole(String? role) {
  if (role == null || role.trim().isEmpty) return '/dashboard';

  if (isStudentRole(role)) {
    return '/dashboard/student';
  }

  if (isTeacherRole(role)) {
    return '/dashboard/teacher';
  }

  // Admin, kurucu, müdür, öğrenci işleri, personel ve diğer tüm kullanıcılar
  return '/dashboard';
}

/// Rol adını arayüzde Türkçe ve anlaşılır göstermek için yardımcı fonksiyon.
String formatRoleName(String? role) {
  if (role == null || role.trim().isEmpty) return 'Kullanıcı';
  final r = role.toLowerCase().trim();
  if (isStudentRole(r)) return 'Öğrenci';
  if (isTeacherRole(r)) return 'Öğretmen';
  if (r == 'owner' || r == 'kurucu') return 'Kurucu';
  if (r == 'admin' || r == 'superadmin') return 'Yönetici';
  if (r.contains('müdür') || r.contains('mudur')) return 'Müdür';
  if (r.contains('öğrenci işleri') || r.contains('student_affairs')) {
    return 'Öğrenci İşleri';
  }
  if (r.contains('muhasebe')) return 'Muhasebe';
  return role;
}

