import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart';
import '../profile/profile_providers.dart';
import 'schedule_providers.dart';

const daysOfWeek = [
  ('Pzt', 'Pazartesi'),
  ('Sal', 'Salı'),
  ('Çar', 'Çarşamba'),
  ('Per', 'Perşembe'),
  ('Cum', 'Cuma'),
  ('Cmt', 'Cumartesi'),
  ('Paz', 'Pazar'),
];

class ScheduleListPage extends ConsumerWidget {
  const ScheduleListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final schedule = ref.watch(scheduleListProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final pageTitle = ref.watch(schedulePageTitleProvider);
    final canEdit = ref.watch(canEditScheduleProvider);
    final canFilter = ref.watch(canFilterScheduleProvider);

    final campusesAsync = ref.watch(campusesListProvider);
    final educationLevelsAsync = ref.watch(educationLevelsListProvider);
    final filteredClassroomsAsync = ref.watch(filteredClassroomsProvider);
    final selectedCampus = ref.watch(scheduleCampusFilterProvider);
    final selectedEducationLevel = ref.watch(
      scheduleEducationLevelFilterProvider,
    );
    final selectedClassroom = ref.watch(scheduleClassroomFilterProvider);

    // Yönetim için sınıf seçilmedi mi?
    final isManagement =
        ref
            .read(authSessionProvider)
            .valueOrNull
            ?.role
            .toLowerCase()
            .contains('admin') ??
        false;
    final needsClassroomSelection = canFilter && selectedClassroom == null;

    return Scaffold(
      appBar: AppBar(title: Text(pageTitle), actions: const []),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          // Filtreler (kampüs -> kademe -> sınıf)
          if (canFilter)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                border: Border(
                  bottom: BorderSide(color: Theme.of(context).dividerColor),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Kampüs seçimi
                  campusesAsync.when(
                    data: (campuses) => DropdownButtonFormField<int?>(
                      initialValue: selectedCampus,
                      decoration: InputDecoration(
                        labelText: 'Kampüs Seçin',
                        hintText: 'Kampüs seçin',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 12,
                        ),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: null,
                          child: Text('Tüm Kampüsler'),
                        ),
                        ...campuses.map((c) {
                          final id =
                              int.tryParse(c['id']?.toString() ?? '') ?? 0;
                          final name = c['name']?.toString() ?? '';
                          return DropdownMenuItem(value: id, child: Text(name));
                        }),
                      ],
                      onChanged: (val) {
                        ref.read(scheduleCampusFilterProvider.notifier).state =
                            val;
                        // Kampüs değişince sınıf sıfırla
                        ref
                                .read(scheduleClassroomFilterProvider.notifier)
                                .state =
                            null;
                      },
                    ),
                    loading: () => const SizedBox.shrink(),
                    error: (_, _) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 12),
                  // Kademe seçimi
                  educationLevelsAsync.when(
                    data: (levels) {
                      final sortedLevels = [...levels];
                      const desired = [
                        'anaokulu',
                        'anasınıfı',
                        'ilkokul',
                        'ortaokul',
                        'lise',
                      ];
                      int rank(Map<String, dynamic> l) {
                        final name = (l['name']?.toString() ?? '')
                            .toLowerCase();
                        for (var i = 0; i < desired.length; i++) {
                          if (name.contains(desired[i])) return i;
                        }
                        final order =
                            int.tryParse(l['order']?.toString() ?? '') ?? 999;
                        return 100 + order;
                      }

                      sortedLevels.sort((a, b) => rank(a).compareTo(rank(b)));

                      return DropdownButtonFormField<int?>(
                        initialValue: selectedEducationLevel,
                        decoration: InputDecoration(
                          labelText: 'Kademe Seçin',
                          hintText: 'Kademe seçin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                        ),
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('Tüm Kademeler'),
                          ),
                          ...sortedLevels.map((l) {
                            final id =
                                int.tryParse(l['id']?.toString() ?? '') ?? 0;
                            final name = l['name']?.toString() ?? '';
                            return DropdownMenuItem(
                              value: id,
                              child: Text(name),
                            );
                          }),
                        ],
                        onChanged: (val) {
                          ref
                                  .read(
                                    scheduleEducationLevelFilterProvider
                                        .notifier,
                                  )
                                  .state =
                              val;
                          // Kademe değişince sınıf sıfırla
                          ref
                                  .read(
                                    scheduleClassroomFilterProvider.notifier,
                                  )
                                  .state =
                              null;
                        },
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (_, _) => const SizedBox.shrink(),
                  ),
                  const SizedBox(height: 12),
                  // Sınıf seçimi (kampüs ve kademe filtreli)
                  filteredClassroomsAsync.when(
                    data: (classrooms) {
                      final sortedClassrooms = [...classrooms];
                      int extractGrade(String name) {
                        final m = RegExp(
                          r'^(\\d{1,2})',
                        ).firstMatch(name.trim());
                        return m == null
                            ? 999
                            : int.tryParse(m.group(1) ?? '') ?? 999;
                      }

                      String extractSuffix(String name) {
                        final m = RegExp(
                          r'^\\d{1,2}\s*[-./]?\s*([A-Za-zÇĞİÖŞÜçğıöşü])',
                        ).firstMatch(name.trim());
                        return (m?.group(1) ?? '').toUpperCase();
                      }

                      sortedClassrooms.sort((a, b) {
                        final na = a['name']?.toString() ?? '';
                        final nb = b['name']?.toString() ?? '';
                        final ga = extractGrade(na);
                        final gb = extractGrade(nb);
                        final cg = ga.compareTo(gb);
                        if (cg != 0) return cg;
                        final sa = extractSuffix(na);
                        final sb = extractSuffix(nb);
                        final cs = sa.compareTo(sb);
                        if (cs != 0) return cs;
                        return na.compareTo(nb);
                      });

                      return DropdownButtonFormField<int?>(
                        initialValue: selectedClassroom,
                        decoration: InputDecoration(
                          labelText: 'Sınıf Seçin',
                          hintText: 'Lütfen sınıf seçin',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 12,
                          ),
                        ),
                        items: [
                          if (!isManagement)
                            const DropdownMenuItem(
                              value: null,
                              child: Text('Tüm Sınıflar'),
                            ),
                          ...sortedClassrooms.map((c) {
                            final id =
                                int.tryParse(c['id']?.toString() ?? '') ?? 0;
                            final name = c['name']?.toString() ?? '';
                            return DropdownMenuItem(
                              value: id,
                              child: Text(name),
                            );
                          }),
                        ],
                        onChanged: (val) =>
                            ref
                                    .read(
                                      scheduleClassroomFilterProvider.notifier,
                                    )
                                    .state =
                                val,
                      );
                    },
                    loading: () => const LinearProgressIndicator(),
                    error: (_, _) => const Text('Sınıflar yüklenemedi'),
                  ),
                ],
              ),
            ),
          // İçerik
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(scheduleListProvider),
              child: schedule.when(
                data: (items) {
                  // Sınıf seçilmedi mesajı (yönetim için)
                  if (needsClassroomSelection) {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.school, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'Lütfen sınıf seçin',
                            style: TextStyle(fontSize: 18),
                          ),
                        ],
                      ),
                    );
                  }
                  if (items.isEmpty) {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 64,
                            color: Colors.grey,
                          ),
                          SizedBox(height: 16),
                          Text('Ders programı bulunamadı'),
                        ],
                      ),
                    );
                  }
                  return _ScheduleTable(items: items, canEdit: canEdit);
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Hata: $e'),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(scheduleListProvider),
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Excel tarzı ders programı tablosu
class _ScheduleTable extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final bool canEdit;

  const _ScheduleTable({required this.items, required this.canEdit});

  @override
  Widget build(BuildContext context) {
    // Verileri düzenle: gün -> saat -> ders
    final scheduleMap = <String, Map<String, Map<String, dynamic>>>{};
    final timeSlots = <String>{};

    String normalizeDayOfWeek(dynamic raw) {
      final v = raw?.toString().trim().toLowerCase() ?? '';
      if (v.isEmpty) return '';

      // numeric (1-7)
      final asInt = int.tryParse(v);
      if (asInt != null) {
        return switch (asInt) {
          1 => 'Pazartesi',
          2 => 'Salı',
          3 => 'Çarşamba',
          4 => 'Perşembe',
          5 => 'Cuma',
          6 => 'Cumartesi',
          7 => 'Pazar',
          _ => '',
        };
      }

      // already Turkish
      if (v.contains('pazart')) return 'Pazartesi';
      if (v == 'salı' || v == 'sali') return 'Salı';
      if (v.contains('çar') || v.contains('car')) return 'Çarşamba';
      if (v.contains('perş') || v.contains('pers')) return 'Perşembe';
      if (v.contains('cuma')) return 'Cuma';
      if (v.contains('cumart')) return 'Cumartesi';
      if (v.contains('pazar')) return 'Pazar';

      // english
      if (v.startsWith('mon')) return 'Pazartesi';
      if (v.startsWith('tue')) return 'Salı';
      if (v.startsWith('wed')) return 'Çarşamba';
      if (v.startsWith('thu')) return 'Perşembe';
      if (v.startsWith('fri')) return 'Cuma';
      if (v.startsWith('sat')) return 'Cumartesi';
      if (v.startsWith('sun')) return 'Pazar';

      return '';
    }

    String normalizeTime(dynamic raw) {
      final t = raw?.toString().trim() ?? '';
      if (t.length >= 5) return t.substring(0, 5);
      return t;
    }

    for (final item in items) {
      final day = normalizeDayOfWeek(item['day_of_week']);
      final startTime = normalizeTime(item['start_time']);

      if (day.isEmpty || startTime.isEmpty) {
        continue;
      }

      scheduleMap.putIfAbsent(day, () => {});
      scheduleMap[day]![startTime] = item;
      timeSlots.add(startTime);
    }

    // Saatleri sırala
    final sortedTimes = timeSlots.toList()..sort();

    // Günleri tanımla ( Pazartesi'den Pazar'a)
    final allDays = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
      'Pazar',
    ];

    // Hiç ders yoksa o günü tabloda göstermeyelim
    final days = allDays
        .where((d) => (scheduleMap[d]?.isNotEmpty ?? false))
        .toList();

    // Edge case: normalize edilen gün adları beklenmeyen bir formatta geldiyse
    // (ör. tüm günler boş göründüyse), yine de 5 iş gününü gösterelim.
    if (days.isEmpty) {
      days.addAll(const ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']);
    }

    return SingleChildScrollView(
      scrollDirection: Axis.vertical,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Card(
          margin: const EdgeInsets.all(16),
          child: Table(
            border: TableBorder.all(
              color: Theme.of(context).dividerColor,
              width: 1,
            ),
            columnWidths: {
              0: const FixedColumnWidth(80), // Saat sütunu
              for (int i = 0; i < days.length; i++)
                i + 1: const FixedColumnWidth(120), // Gün sütunları
            },
            children: [
              // Başlık satırı
              TableRow(
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor,
                ),
                children: [
                  const _TableHeaderCell('Saat'),
                  ...days.map((day) => _TableHeaderCell(day.substring(0, 3))),
                ],
              ),
              // Saat satırları
              ...sortedTimes.map((time) {
                return TableRow(
                  children: [
                    _TableTimeCell(time),
                    ...days.map((day) {
                      final item = scheduleMap[day]?[time];
                      if (item == null) {
                        return const _TableEmptyCell();
                      }
                      return _TableLessonCell(item: item, canEdit: canEdit);
                    }),
                  ],
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

// Tablo hücre widget'ları
class _TableHeaderCell extends StatelessWidget {
  final String text;

  const _TableHeaderCell(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      alignment: Alignment.center,
      child: Text(
        text,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _TableTimeCell extends StatelessWidget {
  final String time;

  const _TableTimeCell(this.time);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      alignment: Alignment.center,
      color: Theme.of(
        context,
      ).colorScheme.primaryContainer.withValues(alpha: 0.3),
      child: Text(
        time,
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 11,
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}

class _TableEmptyCell extends StatelessWidget {
  const _TableEmptyCell();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      padding: const EdgeInsets.all(8),
      alignment: Alignment.center,
      child: const Text(
        '-',
        style: TextStyle(color: Colors.grey, fontSize: 12),
      ),
    );
  }
}

class _TableLessonCell extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool canEdit;

  const _TableLessonCell({required this.item, required this.canEdit});

  @override
  Widget build(BuildContext context) {
    final lesson = item['lesson_name']?.toString() ?? '';
    final classroom = item['classroom_name']?.toString() ?? '';
    final teacher = item['teacher_name']?.toString() ?? '';

    return SizedBox(
      height: 80,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: ClipRect(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.secondaryContainer,
              borderRadius: BorderRadius.circular(6),
            ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.max,
                children: [
                  Flexible(
                    flex: 2,
                    child: Text(
                      lesson,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                        height: 1.05,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSecondaryContainer,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  if (classroom.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Flexible(
                      flex: 1,
                      child: Text(
                        classroom,
                        style: TextStyle(
                          fontSize: 9,
                          height: 1.05,
                          color: Theme.of(context)
                              .colorScheme
                              .onSecondaryContainer
                              .withValues(alpha: 0.8),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                  if (teacher.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Flexible(
                      flex: 1,
                      child: Text(
                        teacher,
                        style: TextStyle(
                          fontSize: 8,
                          height: 1.05,
                          color: Theme.of(context)
                              .colorScheme
                              .onSecondaryContainer
                              .withValues(alpha: 0.7),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
    );
  }
}
