import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/link_utils.dart';
import '../../core/utils/role_utils.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import 'grades_paging_controller.dart';
import 'grades_providers.dart';

class GradesListPage extends ConsumerStatefulWidget {
  const GradesListPage({super.key});

  @override
  ConsumerState<GradesListPage> createState() => _GradesListPageState();
}

class _GradesListPageState extends ConsumerState<GradesListPage> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(gradesPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(gradesPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paging = ref.watch(gradesPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final authSession = ref.watch(authSessionProvider);
    final role = (authSession.valueOrNull?.role ??
            profile.valueOrNull?['role'] ??
            profile.valueOrNull?['role_name'] ??
            '')
        .toString();
    final isStudent = isStudentRole(role);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notlar'),
        actions: [
          if (!isStudent)
            TextButton(
              onPressed: () => _openReportCardDialog(context),
              child: const Text('Karne'),
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(gradesPagingProvider.notifier).loadInitial(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: paging.initialLoading
              ? const Center(child: CircularProgressIndicator())
              : paging.error != null
              ? Center(child: Text('Hata: ${paging.error}'))
              : ListView.separated(
                  controller: _scrollController,
                  itemCount: paging.items.length + (paging.hasMore ? 1 : 0),
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    if (index >= paging.items.length) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }

                    final g = paging.items[index];
                    final id = (g['id'] is int)
                        ? g['id'] as int
                        : int.tryParse('${g['id']}') ?? -1;
                    final grade = (g['grade'] ?? '').toString();
                    final gradeType = (g['grade_type'] ?? '').toString();
                    final semester = (g['semester'] ?? '').toString();

                    final exam = g['exam'] is Map ? (g['exam'] as Map) : null;
                    final examName = (exam?['name'] ?? exam?['title'] ?? '')
                        .toString();

                    final student = g['student'] is Map
                        ? (g['student'] as Map)
                        : null;
                    final studentName = (student?['name'] ?? '').toString();

                    return InkWell(
                      onTap: id > 0 ? () => context.go('/grades/$id') : null,
                      child: AppCard(
                        child: Row(
                          children: [
                            Icon(
                              Icons.grade,
                              color: Theme.of(context).primaryColor,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    examName.isEmpty ? 'Not Kaydı' : examName,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Not: $grade'
                                    '${gradeType.isNotEmpty ? ' • $gradeType' : ''}'
                                    '${semester.isNotEmpty ? ' • $semester' : ''}',
                                    style: const TextStyle(color: Colors.grey),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (studentName.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      studentName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  Future<void> _openReportCardDialog(BuildContext context) async {
    final studentIdController = TextEditingController();
    String semester = 'first';

    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Karne Oluştur'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: studentIdController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Student ID',
                      hintText: 'Örn: 123',
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: semester,
                    items: const [
                      DropdownMenuItem(value: 'first', child: Text('1. Dönem')),
                      DropdownMenuItem(
                        value: 'second',
                        child: Text('2. Dönem'),
                      ),
                    ],
                    onChanged: (v) {
                      setState(() {
                        semester = v ?? 'first';
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Dönem'),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Vazgeç'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Oluştur'),
                ),
              ],
            );
          },
        );
      },
    );

    if (result != true) {
      studentIdController.dispose();
      return;
    }

    final studentId = int.tryParse(studentIdController.text.trim()) ?? -1;
    studentIdController.dispose();

    if (studentId <= 0) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Student ID gerekli.')));
      }
      return;
    }

    try {
      final repo = ref.read(gradesRepositoryProvider);
      final res = await repo.generateReportCard(
        studentId: studentId,
        semester: semester,
        queue: false,
      );

      final downloadUrl =
          (res['download_url'] ??
                  (res['data'] is Map ? res['data']['download_url'] : null))
              ?.toString();

      if (!context.mounted) return;

      if (downloadUrl == null || downloadUrl.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Karne oluşturuldu. Download URL bulunamadı.'),
          ),
        );
        return;
      }

      await showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('Karne Hazır'),
            content: SelectableText(downloadUrl),
            actions: [
              TextButton(
                onPressed: () async {
                  await LinkUtils.copyToClipboard(downloadUrl);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Link kopyalandı.')),
                    );
                  }
                },
                child: const Text('Kopyala'),
              ),
              TextButton(
                onPressed: () => LinkUtils.openExternal(downloadUrl),
                child: const Text('Aç'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Kapat'),
              ),
            ],
          );
        },
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Karne hatası: $e')));
      }
    }
  }
}
