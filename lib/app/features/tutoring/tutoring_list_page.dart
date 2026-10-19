import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../profile/profile_providers.dart';
import 'tutoring_paging_controller.dart';

// Rol sabitleri
const teacherRoles = [
  'Öğretmen',
  'Sınıf Öğretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];
const managementRoles = [
  'owner',
  'Genel Müdür',
  'Kampüs Müdürü',
  'Müdür',
  'Müdür Yardımcısı',
  'Öğrenci İşleri',
  'student_affairs',
  'admin',
  'kurucu',
  'superadmin',
  'founder',
];

class TutoringListPage extends ConsumerStatefulWidget {
  const TutoringListPage({super.key});

  @override
  ConsumerState<TutoringListPage> createState() => _TutoringListPageState();
}

class _TutoringListPageState extends ConsumerState<TutoringListPage> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  void _onScroll() {
    final state = ref.read(tutoringPagingProvider);
    if (state.isLoadingMore || !state.hasMore) return;

    final pos = _scrollController.position;
    if (!pos.hasPixels || !pos.hasContentDimensions) return;

    if (pos.pixels > pos.maxScrollExtent - 240) {
      ref.read(tutoringPagingProvider.notifier).loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    ref.invalidate(tutoringPagingProvider);
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return Colors.green;
      case 'pending':
      case 'scheduled':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      case 'in_progress':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'Tamamlandı';
      case 'pending':
        return 'Bekliyor';
      case 'scheduled':
        return 'Planlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'in_progress':
        return 'Devam Ediyor';
      default:
        return status;
    }
  }

  String _getTypeText(String type) {
    switch (type.toLowerCase()) {
      case 'etut':
        return 'Etüt';
      case 'private':
      case 'ozel':
        return 'Özel Ders';
      default:
        return type;
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

  bool _isTeacher(String? role) {
    if (role == null) return false;
    return teacherRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  bool _isManagement(String? role) {
    if (role == null) return false;
    return managementRoles.any((r) => r.toLowerCase() == role.toLowerCase());
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final paging = ref.watch(tutoringPagingProvider);
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final selectedStatus = ref.watch(tutoringStatusFilterProvider);

    final isTeacher = _isTeacher(userRole);
    final isManagement = _isManagement(userRole);

    return Scaffold(
      appBar: AppBar(
        title: Text(isTeacher ? 'Etüt ve Özel Derslerim' : 'Etüt ve Özel Ders'),
        actions: [
          // Sadece yöneticiler yeni etüt/özel ders oluşturabilir
          if (isManagement)
            IconButton(
              onPressed: () async {
                await context.push('/tutoring/new');
                ref.invalidate(tutoringPagingProvider);
              },
              icon: const Icon(Icons.add),
              tooltip: 'Yeni Etüt/Özel Ders',
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.read(tutoringStatusFilterProvider.notifier).state = 'all';
          return ref.read(tutoringPagingProvider.notifier).loadInitial();
        },
        child: Column(
          children: [
            // Durum filtresi
            Container(
              margin: const EdgeInsets.all(16),
              child: DropdownButtonFormField<String>(
                initialValue: selectedStatus,
                decoration: const InputDecoration(
                  labelText: 'Durum',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 16),
                ),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('Tümü')),
                  DropdownMenuItem(value: 'pending', child: Text('Bekliyor')),
                  DropdownMenuItem(
                    value: 'scheduled',
                    child: Text('Planlandı'),
                  ),
                  DropdownMenuItem(
                    value: 'completed',
                    child: Text('Tamamlandı'),
                  ),
                  DropdownMenuItem(
                    value: 'cancelled',
                    child: Text('İptal Edildi'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    ref.read(tutoringStatusFilterProvider.notifier).state =
                        value;
                    _applyFilters();
                  }
                },
              ),
            ),

            // Liste
            Expanded(
              child: paging.initialLoading
                  ? const Center(child: CircularProgressIndicator())
                  : paging.error != null
                  ? Center(child: Text('Hata: ${paging.error}'))
                  : paging.items.isEmpty
                  ? const Center(child: Text('Etüt/Özel Ders bulunamadı'))
                  : ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: paging.items.length + (paging.hasMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= paging.items.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }

                        final t = paging.items[index];
                        final id = (t['id'] is int)
                            ? t['id'] as int
                            : int.tryParse('${t['id']}') ?? -1;
                        final title = (t['title'] ?? '').toString();
                        final description = (t['description'] ?? '').toString();
                        final date = (t['date'] ?? '').toString();
                        final startTime = (t['start_time'] ?? '').toString();
                        final endTime = (t['end_time'] ?? '').toString();
                        final status = (t['status'] ?? '').toString();
                        final tutoringType = (t['tutoring_type'] ?? '')
                            .toString();

                        final lesson = t['lesson'] is Map
                            ? t['lesson'] as Map
                            : null;
                        final classroom = t['classroom'] is Map
                            ? t['classroom'] as Map
                            : null;

                        return Container(
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
                                  Icon(
                                    tutoringType == 'private'
                                        ? Icons.person
                                        : Icons.menu_book,
                                    color: Theme.of(context).primaryColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      title.isEmpty ? 'Etüt/Özel Ders' : title,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: _getStatusColor(
                                        status,
                                      ).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      _getStatusText(status),
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: _getStatusColor(status),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
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
                              const SizedBox(height: 12),
                              _buildInfoRow('Tür', _getTypeText(tutoringType)),
                              _buildInfoRow(
                                'Ders',
                                lesson?['name']?.toString() ?? '---',
                              ),
                              _buildInfoRow(
                                'Sınıf',
                                classroom?['name']?.toString() ?? '---',
                              ),
                              _buildInfoRow('Tarih', _formatDate(date)),
                              if (startTime.isNotEmpty && endTime.isNotEmpty)
                                _buildInfoRow('Saat', '$startTime - $endTime'),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  if (id > 0) ...[
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: () {
                                          context.go('/tutoring/$id');
                                        },
                                        icon: const Icon(Icons.visibility),
                                        label: const Text('Detay'),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  if ((isTeacher || isManagement) && id > 0) ...[
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        onPressed: () {
                                          context.go('/tutoring/$id/edit');
                                        },
                                        icon: const Icon(Icons.edit),
                                        label: const Text('Düzenle'),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
