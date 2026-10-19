import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/role_utils.dart';
import '../../features/profile/profile_providers.dart';
import '../../features/auth/auth_providers.dart';
import 'drawer_schema.dart';
import 'layout_drawer_builder.dart';
import 'app_drawer.dart';
import 'role_menu_filter.dart';

final drawerSectionsCacheProvider = StateProvider<List<AppDrawerSection>>((
  ref,
) {
  return const <AppDrawerSection>[];
});

void _deferCacheUpdate(Ref ref, List<AppDrawerSection> sections) {
  Future<void>.microtask(() {
    ref.read(drawerSectionsCacheProvider.notifier).state = sections;
  });
}

final drawerSectionsProvider = Provider<List<AppDrawerSection>>((ref) {
  final cached = ref.watch(drawerSectionsCacheProvider);
  final sessionAsync = ref.watch(authSessionProvider);
  final session = sessionAsync.valueOrNull;
  final role = session?.role ?? 'default';

  // 1. ÖĞRENCİ VEYA VELİ PORTAL MENÜLERİ (HER ZAMAN ÖNCELİKLİ)
  // Portallar backend /layout/init personel menüsünü asla kullanmamalıdır.
  final isStudent = session?.isStudent == true ||
      isStudentRole(role) ||
      session?.profile['is_student'] == true ||
      session?.profile['student_name'] != null ||
      session?.profile['school_no'] != null;

  if (isStudent) {
    final sections = studentPortalDrawerSections('student');
    if (cached != sections) _deferCacheUpdate(ref, sections);
    return sections;
  }

  // 2. Personel / Yönetim Rolleri İçin Menü
  final layoutInitAsync = ref.watch(layoutInitProvider);

  // Yükleme sırasında UI zıplamasını önlemek için cache göster (ancak cache farklı bir role ait değilse)
  if (layoutInitAsync.isLoading || sessionAsync.isLoading) {
    if (cached.isNotEmpty) {
      return cached;
    }
  }

  final layoutInit = layoutInitAsync.valueOrNull;
  if (layoutInit == null) {
    final fallback = filterSectionsByRole(
      defaultDrawerSectionsForRole(role),
      role,
    );
    if (fallback.isNotEmpty && cached.isEmpty) _deferCacheUpdate(ref, fallback);
    return fallback;
  }

  final built = buildSectionsFromLayoutInit(layoutInit);
  if (built.isEmpty) {
    final fallback = filterSectionsByRole(
      defaultDrawerSectionsForRole(role),
      role,
    );
    if (fallback.isNotEmpty) _deferCacheUpdate(ref, fallback);
    return fallback;
  }

  final filtered = filterSectionsByRole(built, role);
  if (filtered.isNotEmpty) _deferCacheUpdate(ref, filtered);
  return filtered;
});
