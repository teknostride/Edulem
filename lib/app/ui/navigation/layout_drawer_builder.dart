import 'package:flutter/material.dart';

import 'app_drawer.dart';

List<AppDrawerSection> buildSectionsFromLayoutInit(
  Map<String, dynamic> layoutInit,
) {
  // Yapı backend'e göre değişebilir. Aşağıdaki alanlar denenir.
  final dynamic rawMenu =
      layoutInit['menu'] ??
      layoutInit['menus'] ??
      layoutInit['navigation'] ??
      (layoutInit['data'] is Map ? layoutInit['data']['menu'] : null);

  if (rawMenu is! List) return const [];

  final sections = <AppDrawerSection>[];

  // Menü elemanları hem section'lı hem düz gelebilir.
  // section'lı: [{title:'Yönetim', items:[...]}]
  // düz: [{group:'Yönetim', ...}]
  for (final entry in rawMenu) {
    if (entry is! Map) continue;
    final m = Map<String, dynamic>.from(entry);

    if (m['items'] is List) {
      final title = (m['title'] ?? m['name'] ?? '').toString().trim();
      final items = _buildItems(m['items']);
      if (title.isNotEmpty && items.isNotEmpty) {
        sections.add(AppDrawerSection(title: title, items: items));
      }
    }
  }

  if (sections.isNotEmpty) return sections;

  // düz liste ise group'a göre topla
  final grouped = <String, List<AppDrawerItem>>{};
  for (final entry in rawMenu) {
    if (entry is! Map) continue;
    final m = Map<String, dynamic>.from(entry);
    final group = (m['group'] ?? m['section'] ?? m['category'] ?? 'Menü')
        .toString();
    grouped.putIfAbsent(group, () => []);
    grouped[group]!.addAll(_buildItems([m]));
  }

  for (final e in grouped.entries) {
    if (e.value.isEmpty) continue;
    sections.add(AppDrawerSection(title: e.key, items: e.value));
  }

  return sections;
}

List<AppDrawerItem> _buildItems(dynamic rawItems) {
  if (rawItems is! List) return const [];

  final items = <AppDrawerItem>[];
  for (final entry in rawItems) {
    if (entry is! Map) continue;
    final m = Map<String, dynamic>.from(entry);

    final title = (m['title'] ?? m['name'] ?? m['label'] ?? '')
        .toString()
        .trim();
    if (title.isEmpty) continue;

    final subtitle = (m['subtitle'] ?? m['description']).toString().trim();

    final route = _mapRoute(
      m['route'] ?? m['path'] ?? m['slug'] ?? m['key'] ?? title,
    );
    final icon = _mapIcon(m['icon'] ?? title);

    final childrenRaw = m['children'] ?? m['items'];
    final children = childrenRaw is List
        ? _buildItems(childrenRaw)
        : const <AppDrawerItem>[];

    items.add(
      AppDrawerItem(
        title: title,
        subtitle: subtitle.isEmpty ? null : subtitle,
        icon: icon,
        route: children.isEmpty ? route : null,
        children: children,
      ),
    );
  }

  return items;
}

String? _mapRoute(dynamic raw) {
  final s = raw?.toString().toLowerCase().trim();
  if (s == null || s.isEmpty) return null;

  if (s.contains('search') || s.contains('arama')) {
    return '/search';
  }
  if (s.contains('message') || s.contains('mesaj')) {
    return '/messages';
  }
  if (s.contains('notification') || s.contains('bildirim')) {
    return '/announcements';
  }
  if (s.contains('file') || s.contains('dosya')) {
    return '/files';
  }
  if (s.contains('role') || s.contains('rol')) {
    return '/roles';
  }
  if (s.contains('permission') || s.contains('yetki')) {
    return '/permissions';
  }
  if (s.contains('announcement') || s.contains('duyuru')) {
    return '/announcements';
  }
  if (s.contains('student') || s.contains('öğrenci') || s.contains('ogrenci')) {
    return '/students';
  }
  if (s.contains('user') ||
      s.contains('kullanıcı') ||
      s.contains('kullanici')) {
    return '/users';
  }
  if (s.contains('homework') || s.contains('ödev') || s.contains('odev')) {
    return '/homework';
  }
  if (s.contains('grade') || s.contains('not') || s.contains('puan')) {
    return '/grades';
  }
  if (s.contains('attendance') || s.contains('yoklama')) {
    return '/attendances';
  }
  if (s.contains('exam') || s.contains('sınav') || s.contains('sinav')) {
    return '/exams';
  }
  if (s.contains('classroom') || s.contains('sınıf') || s.contains('sinif')) {
    return '/classrooms';
  }
  if (s.contains('academic-year') ||
      s.contains('egitim yili') ||
      s.contains('eğitim yılı')) {
    return '/academic-years';
  }
  if (s.contains('campus') || s.contains('kampus')) {
    return '/campuses';
  }
  if (s.contains('education-level') ||
      s.contains('egitim seviyesi') ||
      s.contains('eğitim seviyesi')) {
    return '/education-levels';
  }
  if (s.contains('lesson') || s.contains('ders')) {
    return '/lessons';
  }
  if (s.contains('internal-message') || s.contains('dahili mesaj')) {
    return '/internal-messages';
  }
  if (s.contains('activity') || s.contains('etkinlik')) {
    return '/activities';
  }
  if (s.contains('bulletin') || s.contains('bülten') || s.contains('bulten')) {
    return '/bulletins';
  }
  if (s.contains('calendar') || s.contains('takvim')) {
    return '/calendar-events';
  }

  if (s == '/search' ||
      s == '/messages' ||
      s == '/notifications' ||
      s == '/files' ||
      s == '/announcements' ||
      s == '/students' ||
      s == '/users' ||
      s == '/homework' ||
      s == '/grades' ||
      s == '/attendances' ||
      s == '/exams') {
    return s;
  }

  return null;
}

IconData? _mapIcon(dynamic raw) {
  final s = raw?.toString().toLowerCase().trim();
  if (s == null || s.isEmpty) return null;

  if (s.contains('search') || s.contains('arama')) return Icons.search;

  if (s.contains('role') || s.contains('rol')) return Icons.manage_accounts;

  if (s.contains('permission') || s.contains('yetki')) return Icons.key;

  if (s.contains('campaign') ||
      s.contains('announcement') ||
      s.contains('duyuru')) {
    return Icons.campaign;
  }
  if (s.contains('people') ||
      s.contains('student') ||
      s.contains('öğrenci') ||
      s.contains('ogrenci')) {
    return Icons.people;
  }
  if (s.contains('admin') ||
      s.contains('user') ||
      s.contains('kullanıcı') ||
      s.contains('kullanici')) {
    return Icons.admin_panel_settings;
  }
  if (s.contains('message') || s.contains('mesaj')) return Icons.message;
  if (s.contains('notification') || s.contains('bildirim')) {
    return Icons.notifications;
  }
  if (s.contains('file') || s.contains('dosya')) return Icons.folder;
  if (s.contains('homework') || s.contains('ödev') || s.contains('odev')) {
    return Icons.assignment;
  }
  if (s.contains('grade') || s.contains('not') || s.contains('puan')) {
    return Icons.grade;
  }
  if (s.contains('attendance') || s.contains('yoklama')) {
    return Icons.how_to_reg;
  }
  if (s.contains('exam') || s.contains('sınav') || s.contains('sinav')) {
    return Icons.school;
  }
  if (s.contains('classroom') || s.contains('sınıf') || s.contains('sinif')) {
    return Icons.meeting_room;
  }
  if (s.contains('campus') || s.contains('kampus')) {
    return Icons.location_on;
  }
  if (s.contains('academic') || s.contains('yıl') || s.contains('yil')) {
    return Icons.calendar_today;
  }
  if (s.contains('education') || s.contains('seviye')) {
    return Icons.school;
  }
  if (s.contains('lesson') || s.contains('ders')) {
    return Icons.book;
  }
  if (s.contains('internal') || s.contains('dahili')) {
    return Icons.mail;
  }
  if (s.contains('activity') || s.contains('etkinlik')) {
    return Icons.event;
  }
  if (s.contains('bulletin') || s.contains('bülten') || s.contains('bulten')) {
    return Icons.article;
  }
  if (s.contains('calendar') || s.contains('takvim')) {
    return Icons.calendar_month;
  }

  return Icons.chevron_right;
}
