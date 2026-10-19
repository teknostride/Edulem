import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../education_levels/education_levels_providers.dart';
import '../profile/profile_providers.dart';
import 'attendances_paging_controller.dart';

class AttendancesListPage extends ConsumerStatefulWidget {
  const AttendancesListPage({super.key});

  @override
  ConsumerState<AttendancesListPage> createState() =>
      _AttendancesListPageState();
}

class _AttendancesListPageState extends ConsumerState<AttendancesListPage> {
  final _dateController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _dateController.text = DateTime.now().toIso8601String().split('T')[0];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(attendancesPagingControllerProvider.notifier)
          .setDate(_dateController.text);
    });
  }

  @override
  void dispose() {
    _dateController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(attendancesPagingControllerProvider.notifier).loadMore();
    }
  }

  void _applyDateFilter() {
    ref
        .read(attendancesPagingControllerProvider.notifier)
        .setDate(_dateController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(attendancesPagingControllerProvider);
    final items = ref.watch(attendancesVisibleItemsProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final educationLevelsAsync = ref.watch(educationLevelsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yoklama'),
        actions: [
          IconButton(
            onPressed: () async {
              await context.push('/attendances/daily');
              ref.read(attendancesPagingControllerProvider.notifier).refresh();
            },
            icon: const Icon(Icons.today),
          ),
          IconButton(
            onPressed: () => context.push('/attendances/stats'),
            icon: const Icon(Icons.bar_chart),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _dateController,
                  decoration: InputDecoration(
                    hintText: 'Tarih seç',
                    prefixIcon: const Icon(Icons.calendar_today),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _dateController.clear();
                        _applyDateFilter();
                      },
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  readOnly: true,
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate:
                          DateTime.tryParse(_dateController.text) ??
                          DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      _dateController.text = date.toIso8601String().split(
                        'T',
                      )[0];
                      _applyDateFilter();
                    }
                  },
                ),
                const SizedBox(height: 12),
                educationLevelsAsync.when(
                  data: (levels) {
                    final levelItems = [
                      const DropdownMenuItem<int>(
                        value: null,
                        child: Text('Tüm Seviyeler'),
                      ),
                      ...levels.map((l) {
                        final name = l['name']?.toString() ?? '';
                        return DropdownMenuItem<int>(
                          value: l['id'] as int?,
                          child: Text(name),
                        );
                      }),
                    ];
                    return DropdownButtonFormField<int>(
                      initialValue: paging.educationLevelId,
                      decoration: InputDecoration(
                        labelText: 'Eğitim Seviyesi',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                        ),
                      ),
                      items: levelItems,
                      onChanged: (val) {
                        ref
                            .read(attendancesPagingControllerProvider.notifier)
                            .setEducationLevelId(val);
                      },
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, _) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await ref
                    .read(attendancesPagingControllerProvider.notifier)
                    .refresh();
              },
              child: paging.hasError && items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 48,
                            color: Colors.red,
                          ),
                          const SizedBox(height: 16),
                          Text('Hata: ${paging.error}'),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => ref
                                .read(
                                  attendancesPagingControllerProvider.notifier,
                                )
                                .refresh(),
                            child: const Text('Yeniden Dene'),
                          ),
                        ],
                      ),
                    )
                  : items.isEmpty && !paging.isLoading
                  ? const Center(child: Text('Yoklama kaydı bulunamadı'))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: items.length + (paging.hasMore ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index >= items.length) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }

                        final item = items[index];
                        final m = item is Map ? item : <String, dynamic>{};

                        final date = (m['date'] ?? '').toString();
                        final status = (m['status'] ?? '').toString();

                        final student = m['student'] is Map
                            ? m['student'] as Map
                            : <String, dynamic>{};
                        final studentName = (student['name'] ?? '').toString();
                        final schoolNo = (student['school_no'] ?? '')
                            .toString();

                        final schedule = m['schedule'] is Map
                            ? m['schedule'] as Map
                            : <String, dynamic>{};
                        final lesson = schedule['lesson'] is Map
                            ? (schedule['lesson'] as Map)['name']?.toString() ??
                                  ''
                            : '';

                        final classroom = schedule['classroom'] is Map
                            ? (schedule['classroom'] as Map)['name']
                                      ?.toString() ??
                                  ''
                            : '';

                        String statusText = status;
                        Color statusColor = Colors.grey;
                        if (status.toLowerCase() == 'gelmedi') {
                          statusText = 'Gelmedi';
                          statusColor = Colors.red;
                        } else if (status.toLowerCase() == 'geldi') {
                          statusText = 'Geldi';
                          statusColor = Colors.green;
                        } else if (status.toLowerCase() == 'izinli') {
                          statusText = 'İzinli';
                          statusColor = Colors.orange;
                        } else if (status.toLowerCase() == 'raporlu') {
                          statusText = 'Raporlu';
                          statusColor = Colors.purple;
                        } else if (status.toLowerCase() == 'gec') {
                          statusText = 'Geç Geldi';
                          statusColor = Colors.amber;
                        }

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: InkWell(
                            onTap: () {
                              final id = student['id'];
                              if (id != null) {
                                context.go('/students/$id');
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: AppCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          studentName.isEmpty
                                              ? 'Öğrenci'
                                              : studentName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withValues(
                                            alpha: 0.1,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: Text(
                                          statusText,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: statusColor,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (schoolNo.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.numbers_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Okul No: $schoolNo',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  if (classroom.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.class_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          classroom,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  if (lesson.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.book_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            lesson,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.grey,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  if (date.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.event_outlined,
                                          size: 16,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          date,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
