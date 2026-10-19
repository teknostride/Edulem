import '../../core/utils/role_utils.dart';
import 'app_drawer.dart';

bool _isAdminRole(String role) {
  return isStaffOrAdminRole(role);
}

bool _isTeacherRole(String role) {
  return isTeacherRole(role);
}

bool _isRehberRole(String role) {
  final r = role.toLowerCase();
  return r.contains('rehber') || r.contains('counselor');
}

bool _isStudentRole(String role) {
  return isStudentRole(role);
}

List<AppDrawerSection> filterSectionsByRole(
  List<AppDrawerSection> sections,
  String role,
) {
  final isAdmin = _isAdminRole(role);
  final isTeacher = _isTeacherRole(role);
  final isRehber = _isRehberRole(role);
  final isStudent = _isStudentRole(role);
  final filtered = <AppDrawerSection>[];
  for (final section in sections) {
    final items = <AppDrawerItem>[];

    for (final item in section.items) {
      final t = item.title.toLowerCase();

      // Herkesten gizlenecek menüler
      final hiddenItems = <String>[
        'kurum',
        'tenant',
        'bursluluk',
        'scholarship',
        'kurum saatleri',
        'schedule',
        'roller',
        'roles',
        'kampüs',
        'campus',
        'eğitim kademe',
        'education-level',
        'sınıf',
        'classroom',
        'yetki',
        'permission',
        'rol',
        'role',
      ];

      // Admin rolü dışındakilerden kullanıcı menüsünü gizle
      if (!isAdmin) {
        if (t.contains('kullanıcı') || t.contains('user')) {
          continue;
        }
      }

      // Rehberlik Servisi sadece rehber öğretmen ve yöneticilere görünür
      if (!isAdmin && !isRehber) {
        if (t.contains('rehberlik')) {
          continue;
        }
      }

      // Öğretmen rolünde SMS Merkezi ve Dersler gizle
      if (isTeacher) {
        if (t.contains('sms')) {
          continue;
        }
        // Dersler (çoğul) menüsünü ve alt menülerini gizle (Ders Listesi, Ders Programı)
        // Ders Programım (tekil) görünecek, o farklı bir menü
        if (t == 'dersler' || t.contains('dersler ')) {
          continue;
        }
      }

      // Öğrenci rolünde genel Öğrenci Listesi gizlenir
      if (isStudent) {
        if (t == 'öğrenciler' ||
            t == 'öğrenci listesi' ||
            t == 'students' ||
            t == 'student list' ||
            item.route == '/students') {
          continue;
        }
      }

      // Check if this item itself should be hidden
      final itemHidden = hiddenItems.any((k) => t.contains(k));

      if (itemHidden) {
        // Skip this item completely
        continue;
      }

      if (item.hasChildren) {
        // Filter children
        final children = item.children.where((child) {
          final childTitle = child.title.toLowerCase();
          // Hide items in hiddenItems list
          if (hiddenItems.any((k) => childTitle.contains(k))) {
            return false;
          }
          // For teachers, also hide Ders Listesi child items
          if (isTeacher && childTitle.contains('ders listesi')) {
            return false;
          }
          // For students, hide students list
          if (isStudent &&
              (childTitle == 'öğrenciler' ||
                  childTitle == 'öğrenci listesi' ||
                  childTitle == 'students' ||
                  child.route == '/students')) {
            return false;
          }
          return true;
        }).toList();

        // Only add parent if it has visible children
        if (children.isNotEmpty) {
          items.add(
            AppDrawerItem(
              title: item.title,
              subtitle: item.subtitle,
              icon: item.icon,
              route: item.route,
              children: children,
            ),
          );
        }
      } else {
        // No children, add the item
        items.add(item);
      }
    }

    if (items.isNotEmpty) {
      filtered.add(AppDrawerSection(title: section.title, items: items));
    }
  }

  return filtered;
}
