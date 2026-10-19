import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'exams_paging_controller.dart';

class ExamsListPage extends ConsumerStatefulWidget {
  const ExamsListPage({super.key});

  @override
  ConsumerState<ExamsListPage> createState() => _ExamsListPageState();
}

class _ExamsListPageState extends ConsumerState<ExamsListPage> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(examsPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(examsPagingProvider.notifier).loadMore();
    }
  }

  void _showAnalysis(int id) {
    // Analiz detay sayfasına git
    context.push('/exams/$id/analysis');
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(examsPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('OMR Sınav Analizleri')),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(examsPagingProvider.notifier).loadInitial(),
        child: paging.initialLoading
            ? const Center(child: CircularProgressIndicator())
            : paging.error != null
            ? Center(child: Text('Hata: ${paging.error}'))
            : CustomScrollView(
                controller: _scrollController,
                slivers: [
                  // Sınav Listesi
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: paging.items.isEmpty
                        ? const SliverToBoxAdapter(
                            child: Center(
                              child: Padding(
                                padding: EdgeInsets.all(32),
                                child: Text(
                                  'Henüz sınav oluşturulmamış',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                            ),
                          )
                        : SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                if (index >= paging.items.length) {
                                  return paging.hasMore
                                      ? const Padding(
                                          padding: EdgeInsets.symmetric(
                                            vertical: 16,
                                          ),
                                          child: Center(
                                            child: CircularProgressIndicator(),
                                          ),
                                        )
                                      : null;
                                }

                                final e = paging.items[index];
                                final id = (e['id'] is int)
                                    ? e['id'] as int
                                    : int.tryParse('${e['id']}') ?? -1;
                                final examDate = (e['exam_date'] ?? '')
                                    .toString();
                                final type = (e['type'] ?? '').toString();
                                final isActive = e['is_active'] == true;

                                // Sınav adı - name veya id
                                final name = (e['name'] ?? '').toString();
                                final displayName = name.isNotEmpty
                                    ? name
                                    : 'Sınav #$id';

                                // Nested lesson ve classroom'dan isim çıkar
                                final lesson = e['lesson'] is Map
                                    ? (e['lesson'] as Map)
                                    : null;
                                final lessonName =
                                    (lesson?['name'] ?? e['lesson_name'] ?? '')
                                        .toString();

                                final classroom = e['classroom'] is Map
                                    ? (e['classroom'] as Map)
                                    : null;
                                final classroomName =
                                    (classroom?['name'] ??
                                            e['classroom_name'] ??
                                            '')
                                        .toString();

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: isActive
                                          ? Colors.green.shade100
                                          : Colors.red.shade100,
                                      child: Icon(
                                        isActive ? Icons.check : Icons.close,
                                        color: isActive
                                            ? Colors.green
                                            : Colors.red,
                                      ),
                                    ),
                                    title: Text(displayName),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (lessonName.isNotEmpty)
                                          Text(lessonName),
                                        if (classroomName.isNotEmpty)
                                          Text(
                                            classroomName,
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600,
                                            ),
                                          ),
                                        Wrap(
                                          spacing: 8,
                                          children: [
                                            if (type.isNotEmpty)
                                              Chip(
                                                label: Text(type),
                                                padding: EdgeInsets.zero,
                                                labelStyle: const TextStyle(
                                                  fontSize: 10,
                                                ),
                                              ),
                                            if (examDate.isNotEmpty)
                                              Chip(
                                                label: Text(
                                                  _formatDate(examDate),
                                                ),
                                                padding: EdgeInsets.zero,
                                                labelStyle: const TextStyle(
                                                  fontSize: 10,
                                                ),
                                              ),
                                            if (e['is_merged'] == true)
                                              Chip(
                                                label: const Text(
                                                  'Birleştirilmiş',
                                                ),
                                                padding: EdgeInsets.zero,
                                                backgroundColor:
                                                    Colors.purple.shade100,
                                                labelStyle: TextStyle(
                                                  fontSize: 10,
                                                  color: Colors.purple.shade800,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    isThreeLine: true,
                                    trailing: IconButton(
                                      icon: const Icon(
                                        Icons.bar_chart,
                                        color: Colors.blue,
                                      ),
                                      onPressed: id > 0
                                          ? () => _showAnalysis(id)
                                          : null,
                                      tooltip: 'Analiz',
                                    ),
                                    onTap: id > 0
                                        ? () => _showAnalysis(id)
                                        : null,
                                  ),
                                );
                              },
                              childCount:
                                  paging.items.length +
                                  (paging.hasMore ? 1 : 0),
                            ),
                          ),
                  ),
                ],
              ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }
}
