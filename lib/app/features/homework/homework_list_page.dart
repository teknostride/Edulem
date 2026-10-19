import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/role_utils.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import '../campuses/campuses_providers.dart';
import '../education_levels/education_levels_providers.dart';
import '../classrooms/classrooms_providers.dart';
import 'homework_paging_controller.dart';
import 'homework_providers.dart';

// Web sitesi ile aynı rol sabitleri
const managerViewRoles = [
  'owner',
  'Kurucu',
  'Kurum Sahibi',
  'Genel Müdür',
  'Kampüs Müdürü',
  'Müdür',
  'Müdür Yardımcısı',
];
const campusFilterRoles = ['owner', 'Kurucu', 'Kurum Sahibi'];

/// Kurucu, Müdür, Müdür Yardımcısı sadece izleyen; ödev tanımlama butonu gösterme
const viewerOnlyRoles = [
  'owner',
  'Kurucu',
  'Kurum Sahibi',
  'Müdür',
  'Müdür Yardımcısı',
];

const teacherRoles = [
  'Öğretmen',
  'Sınıf Öğretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];

class HomeworkListPage extends ConsumerStatefulWidget {
  const HomeworkListPage({super.key});

  @override
  ConsumerState<HomeworkListPage> createState() => _HomeworkListPageState();
}

class _HomeworkListPageState extends ConsumerState<HomeworkListPage>
    with SingleTickerProviderStateMixin {
  late final ScrollController _scrollController;
  late final TabController _tabController;
  final TextEditingController _studentNameController = TextEditingController();
  Timer? _studentDebounce;
  bool _showFilters = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(homeworkPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(homeworkPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _studentDebounce?.cancel();
    _studentNameController.dispose();
    super.dispose();
  }

  bool _isHomeworkArchived(Map<String, dynamic> h) {
    if (h['is_checked'] == true) return true;
    final checkedCount = (h['checked_assignments_count'] as num?)?.toInt() ?? 0;
    if (checkedCount > 0) return true;
    final gradedCount = (h['graded_count'] as num?)?.toInt() ?? 0;
    if (gradedCount > 0) return true;
    final reviewStatus = (h['review_status'] ?? '').toString().trim();
    if (reviewStatus.isNotEmpty) return true;
    final status = (h['status'] ?? '').toString().toLowerCase();
    if (status == 'completed' || status == 'tamamlandı') return true;
    return false;
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'overdue':
        return Colors.red;
      case 'submitted':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'draft':
        return Colors.grey;
      case 'published':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'overdue':
        return 'Gecikti';
      case 'submitted':
        return 'Teslim Edildi';
      case 'pending':
        return 'Bekliyor';
      case 'draft':
        return 'Taslak';
      case 'published':
        return 'Yayında';
      default:
        return status;
    }
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '---';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  void _applyFilters() {
    ref.invalidate(homeworkPagingProvider);
  }

  Future<void> _showDeleteConfirmDialog(
    int homeworkId,
    String homeworkTitle,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ödevi Sil'),
        content: Text(
          '"$homeworkTitle" ödevini silmek istediğinize emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _deleteHomework(homeworkId);
    }
  }

  Future<void> _deleteHomework(int homeworkId) async {
    try {
      final repo = ref.read(homeworkRepositoryProvider);
      await repo.delete(homeworkId);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Ödev başarıyla silindi')));
        _applyFilters(); // Listeyi yenile
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ödev silinirken hata oluştu: $e')),
        );
      }
    }
  }

  bool _isManagerView(String? role) {
    if (role == null) return false;
    return managerViewRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isCampusFilter(String? role) {
    if (role == null) return false;
    return campusFilterRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isViewerOnly(String? role) {
    if (role == null) return false;
    return viewerOnlyRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isTeacher(String? role) {
    if (role == null) return false;
    return teacherRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isStudent(String? role) {
    return isStudentRole(role);
  }

  Widget _buildStatCard(
    String label,
    String value,
    Color color,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: color.withValues(alpha: 0.8)),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPanel(
    bool isCampusFilter,
    bool isManagerView,
    bool isTeacher,
  ) {
    final campusesAsync = ref.watch(campusesListProvider);
    final educationLevelsAsync = ref.watch(educationLevelsListProvider);
    final selectedCampusId = ref.watch(homeworkCampusFilterProvider);
    final selectedEducationLevelId = ref.watch(
      homeworkEducationLevelFilterProvider,
    );
    final selectedClassroomId = ref.watch(homeworkClassroomFilterProvider);
    final selectedStatus = ref.watch(homeworkStatusFilterProvider);

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Filtreler',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              TextButton(
                onPressed: () {
                  ref.read(homeworkCampusFilterProvider.notifier).state = null;
                  ref
                          .read(homeworkEducationLevelFilterProvider.notifier)
                          .state =
                      null;
                  ref.read(homeworkClassroomFilterProvider.notifier).state =
                      null;
                  ref.read(homeworkTeacherFilterProvider.notifier).state = null;
                  ref.read(homeworkStudentNameFilterProvider.notifier).state =
                      null;
                  ref.read(homeworkStatusFilterProvider.notifier).state = 'all';
                  _studentNameController.clear();
                  _applyFilters();
                },
                child: const Text('Temizle'),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Kampüs filtresi (sadece CAMPUS_FILTER_ROLES için)
          if (isCampusFilter)
            campusesAsync.when(
              data: (campuses) {
                return DropdownButtonFormField<int?>(
                  initialValue: selectedCampusId,
                  decoration: const InputDecoration(
                    labelText: 'Kampüs',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Tümü')),
                    ...campuses.map(
                      (c) => DropdownMenuItem(
                        value: c['id'] as int,
                        child: Text(c['name']?.toString() ?? ''),
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    ref.read(homeworkCampusFilterProvider.notifier).state =
                        value;
                    ref
                            .read(homeworkEducationLevelFilterProvider.notifier)
                            .state =
                        null;
                    ref.read(homeworkClassroomFilterProvider.notifier).state =
                        null;
                    _applyFilters();
                  },
                );
              },
              loading: () => const CircularProgressIndicator(),
              error: (_, _) => const SizedBox.shrink(),
            ),

          if (isCampusFilter) const SizedBox(height: 12),

          // Kademe filtresi
          educationLevelsAsync.when(
            data: (levels) {
              // Kampüs seçiliyse o kampüsteki kademeleri filtrele
              final filteredLevels = selectedCampusId != null
                  ? levels
                        .where((l) => l['campus_id'] == selectedCampusId)
                        .toList()
                  : levels;

              return DropdownButtonFormField<int?>(
                initialValue: selectedEducationLevelId,
                decoration: const InputDecoration(
                  labelText: 'Kademe',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Tümü')),
                  ...filteredLevels.map(
                    (l) => DropdownMenuItem(
                      value: l['id'] as int,
                      child: Text(l['name']?.toString() ?? ''),
                    ),
                  ),
                ],
                onChanged: (value) {
                  ref
                          .read(homeworkEducationLevelFilterProvider.notifier)
                          .state =
                      value;
                  ref.read(homeworkClassroomFilterProvider.notifier).state =
                      null;
                  _applyFilters();
                },
              );
            },
            loading: () => const CircularProgressIndicator(),
            error: (_, _) => const SizedBox.shrink(),
          ),

          const SizedBox(height: 12),

          // Sınıf filtresi
          if (isTeacher || selectedEducationLevelId != null)
            FutureBuilder<List<Map<String, dynamic>>>(
              future: ref
                  .read(classroomsRepositoryProvider)
                  .list(
                    educationLevelId: selectedEducationLevelId,
                    perPage: 200,
                  ),
              builder: (context, snapshot) {
                if (!snapshot.hasData) return const SizedBox(height: 12);
                final classrooms = snapshot.data ?? [];
                if (classrooms.isEmpty && !isTeacher) {
                  return const SizedBox.shrink();
                }

                return Column(
                  children: [
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int?>(
                      initialValue: selectedClassroomId,
                      decoration: const InputDecoration(
                        labelText: 'Sınıf',
                        border: OutlineInputBorder(),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: null,
                          child: Text('Tümü'),
                        ),
                        ...classrooms.map(
                          (c) => DropdownMenuItem(
                            value: c['id'] as int,
                            child: Text(c['name']?.toString() ?? ''),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        ref
                                .read(homeworkClassroomFilterProvider.notifier)
                                .state =
                            value;
                        _applyFilters();
                      },
                    ),
                  ],
                );
              },
            ),

          if (selectedEducationLevelId != null) const SizedBox(height: 12),

          // Durum filtresi
          DropdownButtonFormField<String>(
            initialValue: selectedStatus,
            decoration: const InputDecoration(
              labelText: 'Durum',
              border: OutlineInputBorder(),
            ),
            items: const [
              DropdownMenuItem(value: 'all', child: Text('Tüm Durumlar')),
              DropdownMenuItem(value: 'published', child: Text('Yayında')),
              DropdownMenuItem(value: 'draft', child: Text('Taslak')),
              DropdownMenuItem(value: 'overdue', child: Text('Gecikti')),
              DropdownMenuItem(
                value: 'submitted',
                child: Text('Teslim Edildi'),
              ),
            ],
            onChanged: (value) {
              ref.read(homeworkStatusFilterProvider.notifier).state =
                  value ?? 'all';
              _applyFilters();
            },
          ),

          const SizedBox(height: 12),

          // Öğrenci adı ile arama
          TextField(
            controller: _studentNameController,
            decoration: InputDecoration(
              labelText: 'Öğrenci adı ile ara',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _studentNameController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _studentDebounce?.cancel();
                        _studentNameController.clear();
                        ref
                                .read(
                                  homeworkStudentNameFilterProvider.notifier,
                                )
                                .state =
                            null;
                        _applyFilters();
                      },
                    )
                  : null,
              border: const OutlineInputBorder(),
            ),
            onChanged: (value) {
              _studentDebounce?.cancel();
              _studentDebounce = Timer(const Duration(milliseconds: 400), () {
                if (!mounted) return;
                ref.read(homeworkStudentNameFilterProvider.notifier).state =
                    value.trim().isEmpty ? null : value.trim();
                _applyFilters();
              });
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final paging = ref.watch(homeworkPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    final isManagerView = _isManagerView(userRole);
    final isCampusFilter = _isCampusFilter(userRole);
    final isViewerOnly = _isViewerOnly(userRole);
    final isTeacher = _isTeacher(userRole);
    final isStudent = _isStudent(userRole);

    // İstatistikler
    final stats = paging.stats;
    final totalHomeworks = stats?['total_homeworks'] ?? 0;
    final totalSubmissions = stats?['total_submissions'] ?? 0;
    final gradedCount = stats?['graded_count'] ?? 0;
    final pendingGraded = stats?['pending_graded'] ?? 0;
    final teacherStats = (stats?['teacher_stats'] as List?) ?? [];

    final activeItems = paging.items.where((h) => !_isHomeworkArchived(h)).toList();
    final archivedItems = paging.items.where((h) => _isHomeworkArchived(h)).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isManagerView
              ? 'Ödev Yönetimi'
              : isTeacher
              ? 'Ödevlerim'
              : 'Ödevler',
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            height: 44,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TabBar(
              controller: _tabController,
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              indicator: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(9),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.35),
                    blurRadius: 4,
                    offset: const Offset(0, 1.5),
                  ),
                ],
              ),
              labelColor: Colors.white,
              unselectedLabelColor: const Color(0xFF475569),
              labelStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.assignment_outlined, size: 16),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Bekleyenler (${activeItems.length})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.archive_outlined, size: 16),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Ödev Arşivi (${archivedItems.length})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          if (!isStudent)
            IconButton(
              onPressed: () => setState(() => _showFilters = !_showFilters),
              icon: Icon(_showFilters ? Icons.filter_alt_off : Icons.filter_list),
              tooltip: 'Filtrele',
            ),
          // Viewer only rollerde "Yeni Ödev" butonu gösterme
          if (!isViewerOnly && (isTeacher || isManagerView))
            IconButton(
              onPressed: () async {
                await context.push('/homework/new');
                ref.invalidate(homeworkPagingProvider);
              },
              icon: const Icon(Icons.add),
              tooltip: 'Yeni Ödev',
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      floatingActionButton: null,
      body: RefreshIndicator(
        onRefresh: () async {
          _studentNameController.clear();
          ref.read(homeworkCampusFilterProvider.notifier).state = null;
          ref.read(homeworkEducationLevelFilterProvider.notifier).state = null;
          ref.read(homeworkClassroomFilterProvider.notifier).state = null;
          ref.read(homeworkTeacherFilterProvider.notifier).state = null;
          ref.read(homeworkStudentNameFilterProvider.notifier).state = null;
          ref.read(homeworkStatusFilterProvider.notifier).state = 'all';
          return ref.read(homeworkPagingProvider.notifier).loadInitial();
        },
        child: Column(
          children: [
            // Filtre paneli
            if (_showFilters)
              _buildFilterPanel(isCampusFilter, isManagerView, isTeacher),

            // İstatistikler (sadece manager view)
            if (isManagerView && stats != null)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            'Toplam Ödev',
                            totalHomeworks.toString(),
                            Colors.blue,
                            Icons.book,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildStatCard(
                            'Teslim Edilen',
                            totalSubmissions.toString(),
                            Colors.lightBlue,
                            Icons.send,
                          ),
                        ),
                        Expanded(
                          child: _buildStatCard(
                            'Kontrol Edilen',
                            gradedCount.toString(),
                            Colors.green,
                            Icons.check_circle,
                          ),
                        ),
                        Expanded(
                          child: _buildStatCard(
                            'Not Bekleyen',
                            pendingGraded.toString(),
                            Colors.orange,
                            Icons.access_time,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

            // Öğretmen istatistikleri (sadece manager view)
            if (isManagerView && teacherStats.isNotEmpty)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Öğretmen İstatistikleri',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Consumer(
                      builder: (context, ref, child) {
                        final selectedTeacherId = ref.watch(
                          homeworkTeacherFilterProvider,
                        );
                        return DropdownButtonFormField<int?>(
                          initialValue: selectedTeacherId,
                          decoration: const InputDecoration(
                            labelText: 'Öğretmene göre analiz',
                            border: OutlineInputBorder(),
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: null,
                              child: Text('Tüm öğretmenler'),
                            ),
                            ...teacherStats.map((t) {
                              final tid = t['teacher_id'] as int?;
                              final name =
                                  t['teacher_name']?.toString() ?? 'Bilinmiyor';
                              final count = t['homework_count'] ?? 0;
                              return DropdownMenuItem(
                                value: tid,
                                child: Text('$name ($count ödev)'),
                              );
                            }),
                          ],
                          onChanged: (value) {
                            ref
                                    .read(
                                      homeworkTeacherFilterProvider.notifier,
                                    )
                                    .state =
                                value;
                            _applyFilters();
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),

            // Liste sekmeleri
            Expanded(
              child: paging.initialLoading
                  ? const Center(child: CircularProgressIndicator())
                  : paging.error != null
                  ? Center(child: Text('Hata: ${paging.error}'))
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        // Tab 1: Aktif Ödevler
                        _buildHomeworkListView(
                          items: activeItems,
                          emptyMessage: 'Aktif veya kontrol bekleyen ödev bulunamadı',
                          isTeacher: isTeacher,
                          isManagerView: isManagerView,
                          isArchivedTab: false,
                        ),
                        // Tab 2: Ödev Arşivi (Kontrol Edilmiş)
                        _buildHomeworkListView(
                          items: archivedItems,
                          emptyMessage: 'Arşivlenmiş (kontrol edilmiş) ödev bulunamadı',
                          isTeacher: isTeacher,
                          isManagerView: isManagerView,
                          isArchivedTab: true,
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeworkListView({
    required List<Map<String, dynamic>> items,
    required String emptyMessage,
    required bool isTeacher,
    required bool isManagerView,
    required bool isArchivedTab,
  }) {
    final paging = ref.watch(homeworkPagingProvider);

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isArchivedTab ? Icons.archive_outlined : Icons.assignment_outlined,
              size: 48,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: items.length + (paging.hasMore ? 1 : 0),
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        if (index >= items.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        return _buildHomeworkCard(items[index], isTeacher, isManagerView);
      },
    );
  }

  Widget _buildHomeworkCard(
    Map<String, dynamic> h,
    bool isTeacher,
    bool isManagerView,
  ) {
    final id = (h['id'] is int)
        ? h['id'] as int
        : int.tryParse('${h['id']}') ?? -1;
    final title = (h['title'] ?? '').toString();
    final description = (h['description'] ?? '').toString();
    final dueDate = (h['due_date'] ?? '').toString();
    final isChecked = h['is_checked'] == true;
    final reviewStatus = (h['review_status'] ?? '').toString().toLowerCase();
    final teacherNote = (h['teacher_note'] ?? '').toString();
    final statusLabel = (h['status_label'] ?? '').toString();
    final totalStudents = h['total_students'] ?? 0;
    final status = (h['status'] ?? '').toString();

    Color effectiveStatusColor;
    IconData effectiveStatusIcon;
    String effectiveStatusText;

    if (reviewStatus.isNotEmpty) {
      switch (reviewStatus) {
        case 'done':
        case 'yaptı':
          effectiveStatusColor = Colors.green;
          effectiveStatusIcon = Icons.check_circle;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Yapıldı';
          break;
        case 'completed':
        case 'tamamlandı':
          effectiveStatusColor = Colors.teal;
          effectiveStatusIcon = Icons.task_alt;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Tamamlandı';
          break;
        case 'not_done':
        case 'yapmadı':
          effectiveStatusColor = Colors.red;
          effectiveStatusIcon = Icons.cancel;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Yapılmadı';
          break;
        case 'partial':
        case 'yarım yaptı':
        case 'kısmen yaptı':
        case 'eksik':
          effectiveStatusColor = Colors.orange;
          effectiveStatusIcon = Icons.timelapse;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Eksik';
          break;
        case 'absent':
        case 'gelmedi':
          effectiveStatusColor = Colors.blueGrey;
          effectiveStatusIcon = Icons.person_off_outlined;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Gelmedi';
          break;
        default:
          effectiveStatusColor = Colors.blue;
          effectiveStatusIcon = Icons.check_circle_outline;
          effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : reviewStatus;
      }
    } else if (isChecked) {
      effectiveStatusColor = Colors.green;
      effectiveStatusIcon = Icons.check_circle;
      effectiveStatusText = statusLabel.isNotEmpty ? statusLabel : 'Kontrol Edildi';
    } else {
      effectiveStatusColor = _getStatusColor(status);
      effectiveStatusIcon = Icons.help_outline;
      effectiveStatusText = _getStatusText(status);
    }

    final lesson = h['lesson'] is Map ? h['lesson'] as Map : null;
    final classroom = h['classroom'] is Map ? h['classroom'] as Map : null;
    final teacher = h['teacher'] is Map ? h['teacher'] as Map : null;
    final submissionsCount = h['submissions_count'] ?? 0;
    final gradedCount = h['graded_count'] ?? 0;
    final lastGradedAt = (h['last_graded_at'] ?? '').toString();

    return InkWell(
      onTap: id > 0
          ? () {
              context.push('/homework/$id', extra: h);
            }
          : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.assignment,
                            color: reviewStatus.isNotEmpty
                                ? effectiveStatusColor
                                : isChecked
                                ? Colors.green
                                : status == 'overdue'
                                ? Colors.red
                                : status == 'submitted'
                                ? Colors.green
                                : Theme.of(context).primaryColor,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              title.isEmpty ? 'Ödev' : title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isChecked || reviewStatus.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Icon(
                              effectiveStatusIcon,
                              color: effectiveStatusColor,
                              size: 18,
                            ),
                          ],
                        ],
                      ),
                      if (description.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          description,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.grey,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                if (status.isNotEmpty || isChecked || reviewStatus.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: effectiveStatusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      effectiveStatusText,
                      style: TextStyle(
                        fontSize: 11,
                        color: effectiveStatusColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoRow('Ders', lesson?['name']?.toString() ?? '---'),
            _buildInfoRow(
              'Sınıf',
              classroom?['name']?.toString() ??
                  h['classroom_name']?.toString() ??
                  '---',
            ),
            if (isManagerView) ...[
              _buildInfoRow('Öğretmen', teacher?['name']?.toString() ?? '---'),
              _buildInfoRow(
                'Oluşturulma',
                _formatDate(h['created_at']?.toString() ?? ''),
              ),
            ],
            _buildInfoRow('Teslim Tarihi', _formatDate(dueDate)),
            if ((isChecked || reviewStatus.isNotEmpty) && teacherNote.isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: effectiveStatusColor == Colors.red
                      ? Colors.red.shade50
                      : (effectiveStatusColor == Colors.orange ||
                              effectiveStatusColor == Colors.deepOrange)
                      ? Colors.orange.shade50
                      : Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: effectiveStatusColor == Colors.red
                        ? Colors.red.shade100
                        : (effectiveStatusColor == Colors.orange ||
                                effectiveStatusColor == Colors.deepOrange)
                        ? Colors.orange.shade100
                        : Colors.green.shade100,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.comment_outlined,
                      size: 14,
                      color: effectiveStatusColor == Colors.red
                          ? Colors.red.shade700
                          : (effectiveStatusColor == Colors.orange ||
                                  effectiveStatusColor == Colors.deepOrange)
                          ? Colors.orange.shade700
                          : Colors.green.shade700,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Öğretmen Notu: $teacherNote',
                        style: TextStyle(
                          fontSize: 11,
                          color: effectiveStatusColor == Colors.red
                              ? Colors.red.shade900
                              : (effectiveStatusColor == Colors.orange ||
                                      effectiveStatusColor == Colors.deepOrange)
                              ? Colors.orange.shade900
                              : Colors.green.shade800,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (isManagerView && totalStudents > 0) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$submissionsCount teslim',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '$gradedCount kontrol',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (lastGradedAt.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Son kontrol: ${_formatDate(lastGradedAt)}',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ),
            ],
            // Öğretmen için kontrol ve silme butonları
            if ((isTeacher || isManagerView) && id > 0) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        context.push('/homework/$id/control');
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: const Icon(Icons.check_circle_outline, size: 18),
                      label: const Text(
                        'Kontrol Et',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Silme butonu
                  IconButton(
                    onPressed: () => _showDeleteConfirmDialog(id, title),
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    tooltip: 'Ödevi Sil',
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

