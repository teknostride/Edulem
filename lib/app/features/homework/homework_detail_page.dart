import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/atoms/app_card.dart';
import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../auth/auth_providers.dart';
import '../dashboard/portal_dashboard_provider.dart';
import '../profile/profile_providers.dart';
import 'homework_control_page.dart';
import 'homework_providers.dart';

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

final homeworkDetailProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, id) async {
  try {
    final repo = ref.read(homeworkRepositoryProvider);
    final sessionAsync = ref.watch(authSessionProvider);
    final session = sessionAsync.valueOrNull;
    final role = session?.role.toLowerCase() ?? '';
    final isStudentOrGuardian = role.contains('student') ||
        role.contains('ogrenci') ||
        role.contains('öğrenci') ||
        role.contains('guardian') ||
        role.contains('parent') ||
        role.contains('veli');

    if (isStudentOrGuardian) {
      final currentStudentId = ref.read(selectedPortalStudentIdProvider);
      try {
        return await repo.getByIdForStudentPortal(id, studentId: currentStudentId);
      } catch (e) {
        return await repo.getById(id);
      }
    }
    return await repo.getById(id);
  } catch (e) {
    debugPrint('homeworkDetailProvider ERROR: $e');
    rethrow;
  }
});

class HomeworkDetailPage extends ConsumerStatefulWidget {
  const HomeworkDetailPage({super.key, required this.id, this.initialData});

  final int id;
  final Map<String, dynamic>? initialData;

  @override
  ConsumerState<HomeworkDetailPage> createState() => _HomeworkDetailPageState();
}

class _HomeworkDetailPageState extends ConsumerState<HomeworkDetailPage> {
  final TextEditingController _studentSearchController = TextEditingController();
  String _studentSearchQuery = '';
  String _statusFilter = 'all';

  // Hızlı kontrol durumu
  final Map<int, String?> _localStatuses = {};
  bool _statusInitialized = false;
  bool _isSavingStudentStatus = false;

  @override
  void dispose() {
    _studentSearchController.dispose();
    super.dispose();
  }

  /// Initial ve API'den gelen ödev verisini birleştirir
  Map<String, dynamic> _mergeHomeworkData(
    Map<String, dynamic>? initial,
    Map<String, dynamic> incoming,
  ) {
    if (initial == null) return incoming;
    final merged = Map<String, dynamic>.from(initial);

    for (final entry in incoming.entries) {
      final key = entry.key;
      final val = entry.value;

      if (val == null) continue;

      if (val is String) {
        if (val.trim().isNotEmpty) {
          merged[key] = val;
        }
      } else if (val is Map) {
        if (val.isNotEmpty) {
          merged[key] = val;
        }
      } else if (val is List) {
        if (val.isNotEmpty) {
          merged[key] = val;
        }
      } else {
        merged[key] = val;
      }
    }

    return merged;
  }

  Future<void> _saveQuickStatus(int studentId, String? newStatus) async {
    setState(() {
      _localStatuses[studentId] = newStatus;
      _isSavingStudentStatus = true;
    });

    try {
      final entries = [
        {
          'student_id': studentId,
          'review_status': newStatus,
        }
      ];

      await ref.read(homeworkRepositoryProvider).saveControl(
        homeworkId: widget.id,
        entries: entries,
      );

      ref.invalidate(homeworkControlProvider(widget.id));
      ref.invalidate(homeworkDetailProvider(widget.id));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Öğrenci durumu güncellendi'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Durum güncellenirken hata: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSavingStudentStatus = false);
      }
    }
  }

  Widget _buildStudentSearchAndList(
    AsyncValue<Map<String, dynamic>> controlAsync,
  ) {
    return controlAsync.when(
      data: (controlData) {
        final rawStudents = controlData['students'];
        if (rawStudents is! List || rawStudents.isEmpty) {
          return const AppCard(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: Text(
                  'Bu ödeve atanmış öğrenci bulunmuyor.',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            ),
          );
        }

        // Durumları ilk kez doldur
        if (!_statusInitialized) {
          for (final s in rawStudents) {
            if (s is Map) {
              final id = (s['student_id'] is int)
                  ? s['student_id'] as int
                  : int.tryParse('${s['student_id']}') ?? -1;
              if (id > 0) {
                _localStatuses[id] = s['review_status']?.toString();
              }
            }
          }
          _statusInitialized = true;
        }

        // Filtreleme
        final query = _studentSearchQuery.trim().toLowerCase();
        final filteredList = rawStudents.where((s) {
          if (s is! Map) return false;
          final id = (s['student_id'] is int)
              ? s['student_id'] as int
              : int.tryParse('${s['student_id']}') ?? -1;
          final name = (s['student_name'] ?? '').toString().toLowerCase();
          final schoolNo = (s['school_no'] ?? '').toString().toLowerCase();

          final matchesQuery = query.isEmpty ||
              name.contains(query) ||
              schoolNo.contains(query);
          if (!matchesQuery) return false;

          final curStatus = _localStatuses[id] ?? s['review_status']?.toString();
          if (_statusFilter == 'done') return curStatus == 'done';
          if (_statusFilter == 'not_done') return curStatus == 'not_done';
          if (_statusFilter == 'partial') return curStatus == 'partial';
          if (_statusFilter == 'unreviewed') return curStatus == null || curStatus.isEmpty;
          return true;
        }).toList();

        // Sayılar
        int countDone = 0;
        int countNotDone = 0;
        int countPartial = 0;
        for (final s in rawStudents) {
          if (s is Map) {
            final id = (s['student_id'] is int)
                ? s['student_id'] as int
                : int.tryParse('${s['student_id']}') ?? -1;
            final st = _localStatuses[id] ?? s['review_status']?.toString();
            if (st == 'done') countDone++;
            if (st == 'not_done') countNotDone++;
            if (st == 'partial') countPartial++;
          }
        }

        return AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.people_alt_outlined, color: Color(0xFF1E293B)),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Öğrenciler ve Teslim Durumu',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => context.push('/homework/${widget.id}/control'),
                    icon: const Icon(Icons.fullscreen, size: 18),
                    label: const Text('Tüm Liste'),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // İstatistik Barı
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Text(
                        'Yaptı: $countDone',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.green.shade800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        'Yapmadı: $countNotDone',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.red.shade800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.shade200),
                      ),
                      child: Text(
                        'Eksik: $countPartial',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.orange.shade800,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Öğrenci Arama Kutusu
              TextField(
                controller: _studentSearchController,
                decoration: InputDecoration(
                  hintText: 'Öğrenci ara (isim veya okul no)...',
                  hintStyle: const TextStyle(fontSize: 13, color: Colors.grey),
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _studentSearchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _studentSearchController.clear();
                            setState(() => _studentSearchQuery = '');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
                  ),
                ),
                onChanged: (val) {
                  setState(() => _studentSearchQuery = val);
                },
              ),
              const SizedBox(height: 10),
              // Durum Filtre Butonları
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('all', 'Tümü (${rawStudents.length})'),
                    const SizedBox(width: 6),
                    _buildFilterChip('done', 'Yaptı ($countDone)'),
                    const SizedBox(width: 6),
                    _buildFilterChip('not_done', 'Yapmadı ($countNotDone)'),
                    const SizedBox(width: 6),
                    _buildFilterChip('partial', 'Eksik ($countPartial)'),
                    const SizedBox(width: 6),
                    _buildFilterChip('unreviewed', 'Bekliyor'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              // Öğrenci Listesi
              if (filteredList.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Text(
                      'Aramanıza uygun öğrenci bulunamadı.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredList.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final s = filteredList[index] as Map;
                    final studentId = (s['student_id'] is int)
                        ? s['student_id'] as int
                        : int.tryParse('${s['student_id']}') ?? -1;
                    final studentName = s['student_name']?.toString() ?? 'Öğrenci';
                    final schoolNo = s['school_no']?.toString() ?? '';
                    final currentStatus = _localStatuses[studentId] ?? s['review_status']?.toString();

                    Color statusColor = Colors.grey.shade600;
                    Color statusBg = Colors.grey.shade100;
                    String statusText = 'Bekliyor';

                    if (currentStatus == 'done') {
                      statusColor = Colors.green.shade800;
                      statusBg = Colors.green.shade100;
                      statusText = 'Yaptı';
                    } else if (currentStatus == 'not_done') {
                      statusColor = Colors.red.shade800;
                      statusBg = Colors.red.shade100;
                      statusText = 'Yapmadı';
                    } else if (currentStatus == 'partial') {
                      statusColor = Colors.orange.shade800;
                      statusBg = Colors.orange.shade100;
                      statusText = 'Eksik';
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: const Color(0xFFF1F5F9),
                            child: Text(
                              studentName.isNotEmpty ? studentName[0].toUpperCase() : '?',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF334155),
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  studentName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                if (schoolNo.isNotEmpty)
                                  Text(
                                    'No: $schoolNo',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          // Hızlı Durum Butonları
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildQuickActionBtn(
                                icon: Icons.check,
                                color: Colors.green,
                                isSelected: currentStatus == 'done',
                                tooltip: 'Yaptı',
                                onTap: () => _saveQuickStatus(
                                  studentId,
                                  currentStatus == 'done' ? null : 'done',
                                ),
                              ),
                              const SizedBox(width: 4),
                              _buildQuickActionBtn(
                                icon: Icons.close,
                                color: Colors.red,
                                isSelected: currentStatus == 'not_done',
                                tooltip: 'Yapmadı',
                                onTap: () => _saveQuickStatus(
                                  studentId,
                                  currentStatus == 'not_done' ? null : 'not_done',
                                ),
                              ),
                              const SizedBox(width: 4),
                              _buildQuickActionBtn(
                                icon: Icons.timelapse,
                                color: Colors.orange,
                                isSelected: currentStatus == 'partial',
                                tooltip: 'Eksik',
                                onTap: () => _saveQuickStatus(
                                  studentId,
                                  currentStatus == 'partial' ? null : 'partial',
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: statusBg,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  statusText,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: statusColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        );
      },
      loading: () => AppCard(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 12),
              Text(
                'Öğrenci teslim listesi yükleniyor...',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
      error: (err, _) => const SizedBox.shrink(),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _statusFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _statusFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required IconData icon,
    required Color color,
    required bool isSelected,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: _isSavingStudentStatus ? null : onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: isSelected ? color : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? color : color.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: Icon(
          icon,
          size: 16,
          color: isSelected ? Colors.white : color,
        ),
      ),
    );
  }

  /// Verilen Map'ten ödev detay widget'ını çizer
  Widget _buildContentFromData(
    Map<String, dynamic> h,
    bool isTeacher,
    bool isManagement,
  ) {
    final title = (h['title'] ?? '').toString();
    final description = (h['description'] ?? '').toString();
    final dueDate = (h['due_date'] ?? '').toString();
    final createdAt = (h['created_at'] ?? '').toString();
    final isActive = h['is_active'] == true;
    final isChecked = h['is_checked'] == true;
    final reviewStatus = (h['review_status'] ?? '').toString().toLowerCase();
    final teacherNote = (h['teacher_note'] ?? '').toString();
    final statusLabel = (h['status_label'] ?? '').toString();
    final submittedCount = h['submitted_count'] ?? 0;

    Color statusBgColor = Colors.green.shade100;
    Color statusTextColor = Colors.green.shade800;
    Color cardBgColor = Colors.green.shade50;
    Color cardBorderColor = Colors.green.shade200;
    Color cardTextColor = Colors.green.shade900;
    IconData cardIcon = Icons.rate_review_outlined;
    Color cardIconColor = Colors.green;
    String badgeText = statusLabel.isNotEmpty ? statusLabel : 'Kontrol Edildi';

    if (reviewStatus == 'not_done' || reviewStatus == 'yapmadı') {
      statusBgColor = Colors.red.shade100;
      statusTextColor = Colors.red.shade800;
      cardBgColor = Colors.red.shade50;
      cardBorderColor = Colors.red.shade200;
      cardTextColor = Colors.red.shade900;
      cardIcon = Icons.cancel_outlined;
      cardIconColor = Colors.red;
      badgeText = statusLabel.isNotEmpty ? statusLabel : 'Yapmadı';
    } else if (reviewStatus == 'partial' || reviewStatus == 'yarım yaptı' || reviewStatus == 'kısmen yaptı') {
      statusBgColor = Colors.orange.shade100;
      statusTextColor = Colors.orange.shade800;
      cardBgColor = Colors.orange.shade50;
      cardBorderColor = Colors.orange.shade200;
      cardTextColor = Colors.orange.shade900;
      cardIcon = Icons.timelapse;
      cardIconColor = Colors.orange;
      badgeText = statusLabel.isNotEmpty ? statusLabel : 'Yarım Yaptı';
    } else if (reviewStatus == 'missing' || reviewStatus == 'eksik') {
      statusBgColor = Colors.orange.shade100;
      statusTextColor = Colors.orange.shade800;
      cardBgColor = Colors.orange.shade50;
      cardBorderColor = Colors.orange.shade200;
      cardTextColor = Colors.orange.shade900;
      cardIcon = Icons.warning_amber_rounded;
      cardIconColor = Colors.deepOrange;
      badgeText = statusLabel.isNotEmpty ? statusLabel : 'Eksik';
    } else if (reviewStatus == 'done' || reviewStatus == 'yaptı') {
      badgeText = statusLabel.isNotEmpty ? statusLabel : 'Yaptı';
    }
    final totalStudents = h['total_students'] ?? 0;

    final lesson = h['lesson'] is Map ? (h['lesson'] as Map) : null;
    final classroom = h['classroom'] is Map ? (h['classroom'] as Map) : null;
    final teacher = h['teacher'] is Map ? (h['teacher'] as Map) : null;
    final file = h['file'] is Map ? (h['file'] as Map) : null;

    final controlAsync = (isTeacher || isManagement)
        ? ref.watch(homeworkControlProvider(widget.id))
        : null;

    return ListView(
      children: [
        // Ödev Bilgileri Kartı
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title.isEmpty ? 'Ödev' : title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      if (!isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Pasif',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      if (isChecked || reviewStatus.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: statusBgColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeText,
                            style: TextStyle(
                              fontSize: 11,
                              color: statusTextColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (description.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.shade50.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.description_outlined,
                            size: 16,
                            color: Colors.blueGrey,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Ödev Açıklaması',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.blueGrey,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        description,
                        style: const TextStyle(fontSize: 14, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              _buildInfoRow('Teslim Tarihi', _formatDate(dueDate), Icons.event_outlined),
              if (lesson != null)
                _buildInfoRow(
                  'Ders',
                  lesson['name']?.toString() ?? '',
                  Icons.book_outlined,
                ),
              if (classroom != null)
                _buildInfoRow(
                  'Sınıf',
                  classroom['name']?.toString() ?? '',
                  Icons.class_outlined,
                ),
              if (teacher != null)
                _buildInfoRow(
                  'Öğretmen',
                  teacher['name']?.toString() ?? '',
                  Icons.person_outline,
                ),
              if (createdAt.isNotEmpty)
                _buildInfoRow(
                  'Oluşturulma',
                  _formatDateTime(createdAt),
                  Icons.schedule_outlined,
                ),
              if (totalStudents > 0)
                _buildInfoRow(
                  'Teslim Oranı',
                  '$submittedCount/$totalStudents',
                  Icons.assignment_turned_in,
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if ((isChecked || reviewStatus.isNotEmpty) && teacherNote.isNotEmpty) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      cardIcon,
                      color: cardIconColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Öğretmen Değerlendirmesi: $badgeText',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cardBgColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorderColor),
                  ),
                  child: Text(
                    teacherNote,
                    style: TextStyle(
                      fontSize: 14,
                      color: cardTextColor,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
        if (file != null) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Ödev Dosyası',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.description_outlined, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        file['name']?.toString() ?? 'Dosya',
                        style: const TextStyle(color: Colors.blue),
                      ),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.download),
                      tooltip: 'Dosyayı indir',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Öğretmen ve Yönetici için ALTTAN ÖĞRENCİ ARAMA VE LİSTELEME
        if (controlAsync != null) ...[
          _buildStudentSearchAndList(controlAsync),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: const TextStyle(
              fontSize: 13,
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr.trim().isEmpty) return '---';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      final day = date.day.toString().padLeft(2, '0');
      final month = date.month.toString().padLeft(2, '0');
      final year = date.year.toString();
      if (dateStr.contains(':')) {
        final hour = date.hour.toString().padLeft(2, '0');
        final minute = date.minute.toString().padLeft(2, '0');
        if (hour != '00' || minute != '00') {
          return '$day.$month.$year $hour:$minute';
        }
      }
      return '$day.$month.$year';
    } catch (e) {
      if (RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(dateStr)) {
        final parts = dateStr.substring(0, 10).split('-');
        return '${parts[2]}.${parts[1]}.${parts[0]}';
      }
      return dateStr;
    }
  }

  String _formatDateTime(String dateStr) {
    if (dateStr.trim().isEmpty) return '---';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      final day = date.day.toString().padLeft(2, '0');
      final month = date.month.toString().padLeft(2, '0');
      final year = date.year.toString();
      final hour = date.hour.toString().padLeft(2, '0');
      final minute = date.minute.toString().padLeft(2, '0');
      return '$day.$month.$year $hour:$minute';
    } catch (e) {
      return _formatDate(dateStr);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    final detail = ref.watch(homeworkDetailProvider(widget.id));
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    // Rol kontrolü
    bool isTeacher =
        userRole != null &&
        teacherRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());
    bool isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ödev Detayı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (isTeacher && widget.id > 0)
            IconButton(
              onPressed: () => context.push('/homework/${widget.id}/edit'),
              icon: const Icon(Icons.edit),
              tooltip: 'Ödevi Düzenle',
            ),
          if ((isManagement || isTeacher) && widget.id > 0)
            IconButton(
              onPressed: () => context.push('/homework/${widget.id}/control'),
              icon: const Icon(Icons.checklist_rtl),
              tooltip: 'Detaylı Ödev Kontrol',
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: detail.when(
          data: (h) => _buildContentFromData(
            _mergeHomeworkData(widget.initialData, h),
            isTeacher,
            isManagement,
          ),
          loading: () => widget.initialData != null
              ? _buildContentFromData(
                  widget.initialData!,
                  isTeacher,
                  isManagement,
                )
              : Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      CircularProgressIndicator(strokeWidth: 2.5),
                      SizedBox(height: 16),
                      Text(
                        'Ödev yükleniyor...',
                        style: TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ],
                  ),
                ),
          error: (e, _) => widget.initialData != null
              ? _buildContentFromData(
                  widget.initialData!,
                  isTeacher,
                  isManagement,
                )
              : Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 40, color: Colors.red),
                      const SizedBox(height: 12),
                      Text('Ödev yüklenemedi: $e'),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => ref.invalidate(homeworkDetailProvider(widget.id)),
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
