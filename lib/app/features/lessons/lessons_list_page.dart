import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'lessons_providers.dart';

class LessonsListPage extends ConsumerStatefulWidget {
  const LessonsListPage({super.key});

  @override
  ConsumerState<LessonsListPage> createState() => _LessonsListPageState();
}

class _LessonsListPageState extends ConsumerState<LessonsListPage> {
  String _searchQuery = '';

  String _getLevelDisplayName(dynamic level) {
    if (level == null) return 'Diğer';
    if (level is String) return level;
    if (level is Map) {
      return level['name']?.toString() ??
          level['display_name']?.toString() ??
          'Diğer';
    }
    return 'Diğer';
  }

  int _getLevelOrder(String levelName) {
    final normalized = levelName.toLowerCase();
    if (normalized.contains('anaokul')) return 1;
    if (normalized.contains('ilkokul')) return 2;
    if (normalized.contains('ortaokul')) return 3;
    if (normalized.contains('lise')) return 4;
    return 99;
  }

  @override
  Widget build(BuildContext context) {
    final lessons = ref.watch(lessonsListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Dersler')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(lessonsListProvider),
        child: lessons.when(
          data: (items) {
            if (items.isEmpty) {
              return const Center(child: Text('Ders bulunamadı'));
            }

            // Filtrele
            final filtered = _searchQuery.isEmpty
                ? items
                : items.where((l) {
                    final name = l['name']?.toString().toLowerCase() ?? '';
                    final code = l['code']?.toString().toLowerCase() ?? '';
                    return name.contains(_searchQuery.toLowerCase()) ||
                        code.contains(_searchQuery.toLowerCase());
                  }).toList();

            // Kademelere göre grupla
            final grouped = <String, List<Map<String, dynamic>>>{};
            for (final lesson in filtered) {
              final levelName = _getLevelDisplayName(lesson['education_level']);
              grouped.putIfAbsent(levelName, () => []).add(lesson);
            }

            // Kademeleri sırala
            final sortedLevels = grouped.keys.toList()
              ..sort((a, b) => _getLevelOrder(a).compareTo(_getLevelOrder(b)));

            return Column(
              children: [
                // Arama
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Ders ara...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) => setState(() => _searchQuery = value),
                  ),
                ),
                // Liste
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: sortedLevels.length,
                    itemBuilder: (context, index) {
                      final levelName = sortedLevels[index];
                      final levelLessons = grouped[levelName]!;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Kademe başlığı
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Theme.of(
                                      context,
                                    ).primaryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Text(
                                    levelName,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Theme.of(context).primaryColor,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '(${levelLessons.length} ders)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Dersler
                          ...levelLessons.map((lesson) {
                            final name =
                                lesson['name']?.toString() ?? 'İsimsiz';
                            final code = lesson['code']?.toString();
                            final weeklyHours = lesson['weekly_hours'];
                            final teachers = lesson['teachers'] as List? ?? [];
                            final teachersCount = lesson['teachers_count'] is int
                                ? lesson['teachers_count'] as int
                                : (int.tryParse(lesson['teachers_count']?.toString() ?? '') ?? teachers.length);
                            final teacherCount = teachers.isNotEmpty ? teachers.length : teachersCount;

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: AppCard(
                                padding: const EdgeInsets.all(12),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 4,
                                  ),
                                  onTap: () {
                                    final id = lesson['id'];
                                    if (id != null) {
                                      context.go('/lessons/$id');
                                    }
                                  },
                                  leading: CircleAvatar(
                                    backgroundColor: Theme.of(
                                      context,
                                    ).primaryColor.withValues(alpha: 0.1),
                                    child: Icon(
                                      Icons.book,
                                      color: Theme.of(context).primaryColor,
                                      size: 20,
                                    ),
                                  ),
                                  title: Text(
                                    name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  subtitle: Row(
                                    children: [
                                      if (code != null && code.isNotEmpty)
                                        Text('$code • '),
                                      if (weeklyHours != null)
                                        Text('$weeklyHours saat • '),
                                      Text('$teacherCount öğretmen'),
                                    ],
                                  ),
                                  trailing: const Icon(
                                    Icons.chevron_right,
                                    size: 20,
                                    color: Colors.grey,
                                  ),
                                ),
                              ),
                            );
                          }),
                          const SizedBox(height: 8),
                        ],
                      );
                    },
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('Hata: $e')),
        ),
      ),
    );
  }
}
