import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import '../auth/auth_providers.dart';
import 'tutoring_attendance_page.dart';
import 'tutoring_detail_sheet.dart';
import 'tutoring_paging_controller.dart';
import 'tutoring_sms_sheet.dart';

class TutoringListPage extends ConsumerStatefulWidget {
  const TutoringListPage({super.key});

  @override
  ConsumerState<TutoringListPage> createState() => _TutoringListPageState();
}



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

class _TutoringListPageState extends ConsumerState<TutoringListPage> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Initial load is handled in the controller constructor, 
    // but just in case we need to refresh on mount, we can call it.
    // Future.microtask(() => ref.read(tutoringPagingProvider.notifier).loadInitial());
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(tutoringPagingProvider.notifier).loadMore();
    }
  }

  Future<void> _handleDelete(int id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Silme Onayı'),
        content: const Text('Bu etüt oturumunu silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sil', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (ok == true) {
      try {
        await ref.read(tutoringPagingProvider.notifier).deleteTutoring(id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Oturum başarıyla silindi.')));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);
    final state = ref.watch(tutoringPagingProvider);
    final sessionAsync = ref.watch(authSessionProvider);
    
    final userRole = sessionAsync.valueOrNull?.role;
    final isManagement = userRole != null && managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());
    final isTeacher = userRole != null && (
      userRole.toLowerCase().contains('teacher') ||
      userRole.toLowerCase().contains('ogretmen') ||
      userRole.toLowerCase().contains('öğretmen')
    );

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(isTeacher ? 'Etüt ve Özel Derslerim' : 'Etüt ve Özel Ders'),
        actions: [
          if (isManagement)
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Yeni Oluştur',
              onPressed: () => context.push('/tutoring/new'),
            ),
        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(tutoringPagingProvider.notifier).loadInitial(),
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            const SliverToBoxAdapter(child: SizedBox(height: 16)),

            // Stats Cards
            if (state.stats != null)
              SliverToBoxAdapter(
                child: _buildStatsGrid(state.stats!),
              ),

            // Error State
            if (state.error != null && state.items.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Bir hata oluştu:\n${state.error}', textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(tutoringPagingProvider.notifier).loadInitial(),
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                ),
              )

            // Loading Initial State
            else if (state.initialLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )

            // Empty State
            else if (state.items.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.event_busy, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text('Henüz etüt oturumu bulunmuyor.', style: TextStyle(color: Colors.grey.shade600)),
                    ],
                  ),
                ),
              )

            // List of Items
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      if (i == state.items.length) {
                        return state.isLoadingMore
                            ? const Padding(
                                padding: EdgeInsets.all(16.0),
                                child: Center(child: CircularProgressIndicator()),
                              )
                            : const SizedBox(height: 32);
                      }
                      return _buildSessionCard(state.items[i]);
                    },
                    childCount: state.items.length + (state.hasMore ? 1 : 0),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _buildStatCard(
            title: 'Toplam Etüt',
            value: stats['total_sessions']?.toString() ?? '0',
            icon: Icons.calendar_today,
            color: Colors.blue,
            isPrimary: true,
          ),
          _buildStatCard(
            title: 'Katılım Oranı',
            value: '%${stats['attendance_rate']?.toString() ?? '0'}',
            icon: Icons.people_outline,
            color: Colors.green,
          ),
          _buildStatCard(
            title: 'Bu Haftaki Dersler',
            value: stats['this_week']?.toString() ?? '0',
            icon: Icons.access_time,
            color: Colors.orange,
          ),
          _buildStatCard(
            title: 'Aktif Salonlar',
            value: stats['active_rooms']?.toString() ?? '0',
            icon: Icons.school_outlined,
            color: Colors.cyan,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    bool isPrimary = false,
  }) {
    return Container(
      width: 160,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isPrimary ? color : Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isPrimary ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isPrimary ? Colors.white.withValues(alpha: 0.2) : color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: isPrimary ? Colors.white : color, size: 24),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(
              color: isPrimary ? Colors.white.withValues(alpha: 0.8) : Colors.grey.shade600,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: isPrimary ? Colors.white : Colors.black87,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionCard(Map<String, dynamic> session) {
    final id = session['id'] as int? ?? 0;
    final title = session['title']?.toString() ?? 'İsimsiz Oturum';
    final type = session['tutoring_type']?.toString() ?? 'etut';
    final dateStr = session['date']?.toString() ?? '';
    final startTime = session['start_time']?.toString() ?? '';
    final endTime = session['end_time']?.toString() ?? '';
    final room = session['room']?.toString();
    
    final lesson = session['lesson'] is Map ? session['lesson']['name']?.toString() : 'Bilinmeyen Ders';
    final teacher = session['teacher'] is Map ? session['teacher']['name']?.toString() : 'Bilinmeyen Öğretmen';

    final maxStudents = int.tryParse(session['max_students']?.toString() ?? '0') ?? 0;
    final studentsCount = int.tryParse(session['students_count']?.toString() ?? '0') ?? 0;

    // Attendance summary
    final attSummary = session['attendance_summary'] is Map
        ? Map<String, dynamic>.from(session['attendance_summary'] as Map)
        : null;
    final isTaken = attSummary?['taken'] == true;
    final attRate = attSummary?['rate']?.toString() ?? '0';

    final isPrivate = type == 'private_lesson';
    final typeLabel = isPrivate ? 'Özel Ders' : 'Grup Etüt';
    final typeColor = isPrivate ? Colors.red : Colors.cyan;

    // Time parsing logic safely
    String timeLabel = '-';
    if (startTime.length >= 5 && endTime.length >= 5) {
      final s = startTime.contains(':') && startTime.length > 5 ? startTime.substring(11, 16) : startTime;
      final e = endTime.contains(':') && endTime.length > 5 ? endTime.substring(11, 16) : endTime;
      timeLabel = '$s - $e';
    }

    String dateLabel = dateStr;
    try {
      if (dateStr.isNotEmpty) {
        final d = DateTime.parse(dateStr);
        dateLabel = '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
      }
    } catch (_) {}

    final progressRatio = maxStudents > 0 ? (studentsCount / maxStudents).clamp(0.0, 1.0) : 0.0;
    final isFull = studentsCount >= maxStudents && maxStudents > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B))),
                      const SizedBox(height: 4),
                      Text('ID: #$id', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: Colors.grey),
                  onSelected: (val) {
                    if (val == 'edit') {
                      context.push('/tutoring/$id/edit');
                    } else if (val == 'delete') {
                      _handleDelete(id);
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(value: 'edit', child: Row(children: [Icon(Icons.edit, size: 18), SizedBox(width: 8), Text('Düzenle')])),
                    const PopupMenuItem(value: 'delete', child: Row(children: [Icon(Icons.delete, color: Colors.red, size: 18), SizedBox(width: 8), Text('Sil', style: TextStyle(color: Colors.red))])),
                  ],
                )
              ],
            ),
          ),
          
          const Divider(height: 1, thickness: 1),

          // Card Body
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Info Grid
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildInfoRow(Icons.book, lesson ?? ''),
                          const SizedBox(height: 8),
                          _buildInfoRow(Icons.person, teacher ?? '', color: Colors.grey.shade600),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildInfoRow(Icons.calendar_today, dateLabel),
                          const SizedBox(height: 8),
                          _buildInfoRow(Icons.access_time, timeLabel, color: Colors.blue.shade700),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Tags & Attendance Badge
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (room != null && room.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          room,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade800,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: typeColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        typeLabel,
                        style: TextStyle(
                          fontSize: 11,
                          color: typeColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    // Attendance status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isTaken ? Colors.green.shade50 : Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isTaken ? Colors.green.shade200 : Colors.amber.shade200,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isTaken ? Icons.check_circle : Icons.pending_actions,
                            size: 13,
                            color: isTaken ? Colors.green.shade700 : Colors.amber.shade800,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isTaken
                                ? 'Yoklama Alındı (%$attRate)'
                                : 'Yoklama Bekliyor',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isTaken ? Colors.green.shade900 : Colors.amber.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 14),
                
                // Capacity Progress Bar
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: progressRatio,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            isFull ? Colors.red : Colors.green,
                          ),
                          minHeight: 6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '$studentsCount / ${maxStudents > 0 ? maxStudents : '∞'} Öğrenci',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1, thickness: 1),

          // Action Buttons: Yoklama, Öğrenciler, SMS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
            child: Row(
              children: [
                // Yoklama Butonu
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (ctx) => TutoringAttendancePage(sessionId: id),
                        ),
                      );
                      ref.read(tutoringPagingProvider.notifier).loadInitial();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isTaken ? Colors.teal : Colors.blue.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    icon: Icon(
                      isTaken ? Icons.assignment_turned_in : Icons.fact_check_outlined,
                      size: 15,
                    ),
                    label: Flexible(
                      child: Text(
                        isTaken ? 'Yoklama (%$attRate)' : 'Yoklama Al',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Öğrenciler / Detay Butonu
                OutlinedButton.icon(
                  onPressed: () {
                    TutoringDetailSheet.show(
                      context,
                      sessionId: id,
                      initialData: session,
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  icon: const Icon(Icons.people_outline, size: 15),
                  label: const Text(
                    'Öğrenciler',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
                const SizedBox(width: 6),

                // SMS Gönder Butonu
                IconButton(
                  onPressed: () {
                    TutoringSmsSheet.show(
                      context,
                      session: session,
                    );
                  },
                  icon: const Icon(Icons.sms_outlined, size: 18),
                  tooltip: 'SMS Gönder',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue.shade700,
                    padding: const EdgeInsets.all(8),
                    minimumSize: const Size(36, 36),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade400),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text, 
            style: TextStyle(fontSize: 13, color: color ?? Colors.black87, fontWeight: FontWeight.w500),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}


