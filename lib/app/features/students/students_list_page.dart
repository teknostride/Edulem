import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/role_utils.dart';
import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import 'students_filter_providers.dart';
import 'students_paging_controller.dart';

class StudentsListPage extends ConsumerStatefulWidget {
  const StudentsListPage({super.key});

  @override
  ConsumerState<StudentsListPage> createState() => _StudentsListPageState();
}

class _StudentsListPageState extends ConsumerState<StudentsListPage> {
  late final ScrollController _scrollController;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      ref.read(studentsSearchQueryProvider.notifier).state =
          _searchController.text;
    });
  }

  void _onScroll() {
    final state = ref.read(studentsPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(studentsPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<void> _openFilters() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Consumer(
              builder: (context, ref, _) {
                final campusId = ref.watch(studentsCampusIdFilterProvider);
                final educationLevelId = ref.watch(
                  studentsEducationLevelIdFilterProvider,
                );
                final classroomId = ref.watch(
                  studentsClassroomIdFilterProvider,
                );
                final isActive = ref.watch(studentsIsActiveFilterProvider);
                final sortBy = ref.watch(studentsSortByProvider);
                final sortDir = ref.watch(studentsSortDirProvider);
                final perPage = ref.watch(studentsPerPageProvider);

                final campusesAsync = ref.watch(studentsCampusesProvider);
                final levelsAsync = ref.watch(studentsEducationLevelsProvider);
                final classroomsAsync = ref.watch(studentsClassroomsProvider);

                return ListView(
                  children: [
                    const Text(
                      'Filtreler',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    campusesAsync.when(
                      data: (campuses) {
                        return DropdownButtonFormField<int?>(
                          initialValue: campusId,
                          decoration: const InputDecoration(
                            labelText: 'Kampüs',
                            prefixIcon: Icon(Icons.location_city),
                          ),
                          items: [
                            const DropdownMenuItem<int?>(
                              value: null,
                              child: Text('Tüm Kampüsler'),
                            ),
                            ...campuses.map(
                              (c) => DropdownMenuItem<int?>(
                                value: (c['id'] is int)
                                    ? c['id'] as int
                                    : int.tryParse('${c['id']}'),
                                child: Text((c['name'] ?? '').toString()),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            ref
                                    .read(
                                      studentsCampusIdFilterProvider.notifier,
                                    )
                                    .state =
                                v;
                            ref
                                    .read(
                                      studentsEducationLevelIdFilterProvider
                                          .notifier,
                                    )
                                    .state =
                                null;
                            ref
                                    .read(
                                      studentsClassroomIdFilterProvider
                                          .notifier,
                                    )
                                    .state =
                                null;
                          },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    levelsAsync.when(
                      data: (levels) {
                        return DropdownButtonFormField<int?>(
                          initialValue: educationLevelId,
                          decoration: const InputDecoration(
                            labelText: 'Kademe',
                            prefixIcon: Icon(Icons.school),
                          ),
                          items: [
                            const DropdownMenuItem<int?>(
                              value: null,
                              child: Text('Tüm Kademeler'),
                            ),
                            ...levels.map(
                              (el) => DropdownMenuItem<int?>(
                                value: (el['id'] is int)
                                    ? el['id'] as int
                                    : int.tryParse('${el['id']}'),
                                child: Text((el['name'] ?? '').toString()),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            ref
                                    .read(
                                      studentsEducationLevelIdFilterProvider
                                          .notifier,
                                    )
                                    .state =
                                v;
                            ref
                                    .read(
                                      studentsClassroomIdFilterProvider
                                          .notifier,
                                    )
                                    .state =
                                null;
                          },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    classroomsAsync.when(
                      data: (classrooms) {
                        return DropdownButtonFormField<int?>(
                          initialValue: classroomId,
                          decoration: const InputDecoration(
                            labelText: 'Sınıf',
                            prefixIcon: Icon(Icons.groups),
                          ),
                          items: [
                            const DropdownMenuItem<int?>(
                              value: null,
                              child: Text('Tüm Sınıflar'),
                            ),
                            ...classrooms.map(
                              (cr) => DropdownMenuItem<int?>(
                                value: (cr['id'] is int)
                                    ? cr['id'] as int
                                    : int.tryParse('${cr['id']}'),
                                child: Text((cr['name'] ?? '').toString()),
                              ),
                            ),
                          ],
                          onChanged: educationLevelId == null
                              ? null
                              : (v) {
                                  ref
                                          .read(
                                            studentsClassroomIdFilterProvider
                                                .notifier,
                                          )
                                          .state =
                                      v;
                                },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<bool?>(
                      initialValue: isActive,
                      decoration: const InputDecoration(
                        labelText: 'Durum',
                        prefixIcon: Icon(Icons.verified),
                      ),
                      items: const [
                        DropdownMenuItem<bool?>(
                          value: null,
                          child: Text('Durum'),
                        ),
                        DropdownMenuItem<bool?>(
                          value: true,
                          child: Text('Aktif'),
                        ),
                        DropdownMenuItem<bool?>(
                          value: false,
                          child: Text('Pasif'),
                        ),
                      ],
                      onChanged: (v) {
                        ref
                                .read(studentsIsActiveFilterProvider.notifier)
                                .state =
                            v;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: sortBy,
                      decoration: const InputDecoration(
                        labelText: 'Sıralama',
                        prefixIcon: Icon(Icons.sort),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'student_name',
                          child: Text('İsme göre'),
                        ),
                        DropdownMenuItem(
                          value: 'school_no',
                          child: Text('Noya göre'),
                        ),
                        DropdownMenuItem(
                          value: 'birth_date',
                          child: Text('Doğum Tarihine göre'),
                        ),
                      ],
                      onChanged: (v) {
                        if (v != null) {
                          ref.read(studentsSortByProvider.notifier).state = v;
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: sortDir,
                      decoration: const InputDecoration(
                        labelText: 'Yön',
                        prefixIcon: Icon(Icons.swap_vert),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'asc', child: Text('Artan')),
                        DropdownMenuItem(value: 'desc', child: Text('Azalan')),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        ref.read(studentsSortDirProvider.notifier).state = v;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      initialValue: perPage,
                      decoration: const InputDecoration(
                        labelText: 'Sayfa Başına',
                        prefixIcon: Icon(Icons.view_list),
                      ),
                      items: const [
                        DropdownMenuItem(value: 15, child: Text('15')),
                        DropdownMenuItem(value: 30, child: Text('30')),
                        DropdownMenuItem(value: 50, child: Text('50')),
                        DropdownMenuItem(value: 100, child: Text('100')),
                        DropdownMenuItem(value: 999, child: Text('Hepsi')),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        ref.read(studentsPerPageProvider.notifier).state = v;
                      },
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              ref
                                      .read(
                                        studentsCampusIdFilterProvider.notifier,
                                      )
                                      .state =
                                  null;
                              ref
                                      .read(
                                        studentsEducationLevelIdFilterProvider
                                            .notifier,
                                      )
                                      .state =
                                  null;
                              ref
                                      .read(
                                        studentsClassroomIdFilterProvider
                                            .notifier,
                                      )
                                      .state =
                                  null;
                              ref
                                      .read(
                                        studentsIsActiveFilterProvider.notifier,
                                      )
                                      .state =
                                  null;
                              ref.read(studentsSortByProvider.notifier).state =
                                  'student_name';
                              ref.read(studentsSortDirProvider.notifier).state =
                                  'asc';
                              ref.read(studentsPerPageProvider.notifier).state =
                                  15;
                            },
                            child: const Text('Temizle'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Uygula'),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final authSession = ref.watch(authSessionProvider);
    final role = authSession.valueOrNull?.role;
    final isStudent = isStudentRole(role);

    if (isStudent) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erişim Kısıtlı')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline, size: 64, color: Colors.orange),
                const SizedBox(height: 16),
                const Text(
                  'Bu sayfaya erişim yetkiniz bulunmamaktadır.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.go('/dashboard/student'),
                  child: const Text('Ana Sayfaya Dön'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final isTeacher = isTeacherRole(role);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Öğrenciler'),
        actions: [
          if (!isTeacher)
            IconButton(
              onPressed: () async {
                await context.push('/students/new');
                ref.invalidate(studentsPagingProvider);
              },
              icon: const Icon(Icons.add),
            ),
          IconButton(
            onPressed: _openFilters,
            icon: const Icon(Icons.filter_list),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(studentsPagingProvider.notifier).loadInitial(),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _SearchTextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Consumer(
                  builder: (context, ref, child) {
                    final paging = ref.watch(studentsPagingProvider);
                    final items = ref.watch(studentsVisibleItemsProvider);

                    if (paging.initialLoading) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (paging.error != null) {
                      return Center(child: Text('Hata: ${paging.error}'));
                    }

                    return Column(
                      children: [
                        Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            'Toplam ${paging.total} öğrenci (Sayfa ${paging.page}/${paging.lastPage})',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: Colors.black54),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Expanded(
                          child: ListView.separated(
                            controller: _scrollController,
                            itemCount: items.length + (paging.hasMore ? 1 : 0),
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              if (index >= items.length) {
                                return const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16),
                                  child: Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              }

                              final s = items[index];
                              final id = (s['id'] is int)
                                  ? s['id'] as int
                                  : int.tryParse('${s['id']}') ?? -1;
                              final name = (s['name'] ?? '').toString();
                              final number = (s['student_number'] ?? '')
                                  .toString();
                              final className = (s['class_name'] ?? '')
                                  .toString();

                              return InkWell(
                                onTap: id > 0
                                    ? () => context.go('/students/$id')
                                    : null,
                                child: AppCard(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name.isEmpty ? 'Öğrenci' : name,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          if (number.isNotEmpty)
                                            Expanded(
                                              child: Text(
                                                'No: $number',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          if (className.isNotEmpty)
                                            Text(
                                              className,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchTextField extends StatelessWidget {
  const _SearchTextField({required this.controller, required this.focusNode});

  final TextEditingController controller;
  final FocusNode focusNode;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      decoration: const InputDecoration(
        hintText: 'Öğrenci adı, TCKN, okul no ara...',
        prefixIcon: Icon(Icons.search),
      ),
    );
  }
}
