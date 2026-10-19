import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'scholarship_providers.dart';

/// Bursluluk Sınavları Listesi
/// Web sitesindeki ScholarshipExamList.tsx ile birebir aynı
class ScholarshipListPage extends ConsumerStatefulWidget {
  const ScholarshipListPage({super.key});

  @override
  ConsumerState<ScholarshipListPage> createState() =>
      _ScholarshipListPageState();
}

class _ScholarshipListPageState extends ConsumerState<ScholarshipListPage> {
  final TextEditingController _searchController = TextEditingController();
  int _currentPage = 1;
  List<Map<String, dynamic>> _exams = [];
  bool _hasMore = true;
  bool _isLoading = false;
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadExams({bool refresh = false}) async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      if (refresh) {
        _currentPage = 1;
        _exams = [];
        _hasMore = true;
      }
    });

    try {
      final repo = ref.read(scholarshipRepositoryProvider);
      final result = await repo.listExams(
        page: _currentPage,
        perPage: 50,
        search: _searchController.text.isEmpty ? null : _searchController.text,
      );

      final newExams = result['exams'] as List<Map<String, dynamic>>;

      setState(() {
        if (refresh) {
          _exams = newExams;
        } else {
          _exams.addAll(newExams);
        }
        _hasMore = newExams.length >= 50;
        _currentPage++;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sınavlar yüklenirken hata: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;

    setState(() => _isLoadingMore = true);

    try {
      final repo = ref.read(scholarshipRepositoryProvider);
      final result = await repo.listExams(
        page: _currentPage,
        perPage: 50,
        search: _searchController.text.isEmpty ? null : _searchController.text,
      );

      final newExams = result['exams'] as List<Map<String, dynamic>>;

      setState(() {
        _exams.addAll(newExams);
        _hasMore = newExams.length >= 50;
        if (newExams.isNotEmpty) _currentPage++;
      });
    } catch (e) {
      // Silent fail for load more
    } finally {
      setState(() => _isLoadingMore = false);
    }
  }

  Future<void> _deleteExam(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sınav Sil'),
        content: const Text('Bu sınavı silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(scholarshipRepositoryProvider);
      await repo.deleteExam(id);
      _loadExams(refresh: true);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Sınav silindi')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Silme hatası: $e')));
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '---';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bursluluk Sınavları'),
        actions: [
          IconButton(
            onPressed: () => _loadExams(refresh: true),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await context.push('/scholarship/exams/new');
          _loadExams(refresh: true);
        },
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          // Arama çubuğu
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Sınav ara...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadExams(refresh: true);
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => _loadExams(refresh: true),
            ),
          ),

          // Liste
          Expanded(
            child: _isLoading && _exams.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _exams.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.school_outlined,
                          size: 64,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Henüz bursluluk sınavı oluşturulmamış',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : NotificationListener<ScrollNotification>(
                    onNotification: (scrollInfo) {
                      if (scrollInfo.metrics.pixels >=
                          scrollInfo.metrics.maxScrollExtent - 200) {
                        _loadMore();
                      }
                      return true;
                    },
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _exams.length + (_hasMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= _exams.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }

                        final exam = _exams[index];
                        final id = exam['id'] as int? ?? 0;
                        final title = exam['title']?.toString() ?? 'Bilinmiyor';
                        final examDate = exam['exam_date']?.toString();
                        final examTime = exam['exam_time']?.toString();
                        final location = exam['location']?.toString();
                        final isActive = exam['is_active'] == true;
                        final applicationCount = exam['application_count'] ?? 0;
                        final maxCapacity = exam['max_capacity'];

                        return Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: InkWell(
                            onTap: () {
                              context.push('/scholarship/exams/$id');
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              title,
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Wrap(
                                              spacing: 8,
                                              crossAxisAlignment:
                                                  WrapCrossAlignment.center,
                                              children: [
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 4,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: isActive
                                                        ? Colors.green.shade100
                                                        : Colors.grey.shade200,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          4,
                                                        ),
                                                  ),
                                                  child: Text(
                                                    isActive
                                                        ? 'Aktif'
                                                        : 'Pasif',
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      color: isActive
                                                          ? Colors
                                                                .green
                                                                .shade700
                                                          : Colors
                                                                .grey
                                                                .shade700,
                                                    ),
                                                  ),
                                                ),
                                                if (examDate != null)
                                                  Text(
                                                    'Tarih: ${_formatDate(examDate)}',
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      color:
                                                          Colors.grey.shade600,
                                                    ),
                                                  ),
                                                if (examTime != null)
                                                  Text(
                                                    'Saat: $examTime',
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      color:
                                                          Colors.grey.shade600,
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      PopupMenuButton<String>(
                                        onSelected: (value) {
                                          switch (value) {
                                            case 'edit':
                                              context.push(
                                                '/scholarship/exams/$id/edit',
                                              );
                                              break;
                                            case 'applications':
                                              // Henüz uygulanmadı
                                              break;
                                            case 'statistics':
                                              // Henüz uygulanmadı
                                              break;
                                            case 'delete':
                                              _deleteExam(id);
                                              break;
                                          }
                                        },
                                        itemBuilder: (context) => [
                                          const PopupMenuItem(
                                            value: 'edit',
                                            child: Row(
                                              children: [
                                                Icon(Icons.edit),
                                                SizedBox(width: 8),
                                                Text('Düzenle'),
                                              ],
                                            ),
                                          ),
                                          const PopupMenuItem(
                                            value: 'applications',
                                            child: Row(
                                              children: [
                                                Icon(Icons.people),
                                                SizedBox(width: 8),
                                                Text('Başvurular'),
                                              ],
                                            ),
                                          ),
                                          const PopupMenuItem(
                                            value: 'statistics',
                                            child: Row(
                                              children: [
                                                Icon(Icons.bar_chart),
                                                SizedBox(width: 8),
                                                Text('İstatistikler'),
                                              ],
                                            ),
                                          ),
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Row(
                                              children: [
                                                Icon(
                                                  Icons.delete,
                                                  color: Colors.red,
                                                ),
                                                SizedBox(width: 8),
                                                Text(
                                                  'Sil',
                                                  style: TextStyle(
                                                    color: Colors.red,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 24),
                                  Row(
                                    children: [
                                      if (location != null) ...[
                                        Icon(
                                          Icons.location_on,
                                          size: 16,
                                          color: Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          location,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                      ],
                                      Icon(
                                        Icons.people,
                                        size: 16,
                                        color: Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        maxCapacity != null
                                            ? '$applicationCount / $maxCapacity başvuru'
                                            : '$applicationCount başvuru',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () {
                                            // Henüz uygulanmadı
                                          },
                                          icon: const Icon(Icons.people),
                                          label: Text(
                                            'Başvurular ($applicationCount)',
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () {
                                            context.push(
                                              '/scholarship/exams/$id/edit',
                                            );
                                          },
                                          icon: const Icon(Icons.edit),
                                          label: const Text('Düzenle'),
                                        ),
                                      ),
                                    ],
                                  ),
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
