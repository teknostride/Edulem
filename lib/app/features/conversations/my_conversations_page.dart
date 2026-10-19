import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../profile/profile_providers.dart';
import 'conversations_providers.dart';

class MyConversationsPage extends ConsumerStatefulWidget {
  const MyConversationsPage({super.key});

  @override
  ConsumerState<MyConversationsPage> createState() =>
      _MyConversationsPageState();
}

class _MyConversationsPageState
    extends ConsumerState<MyConversationsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Main tab: meetings | notes | appointments
  int _mainTab = 0;

  // Sub-tabs
  String _meetingTypeSub = 'all'; // all | student | parent
  String _appointmentSub = 'today'; // today | upcoming | past

  // Data
  List<Map<String, dynamic>> _meetings = [];
  List<Map<String, dynamic>> _privateNotes = [];
  List<Map<String, dynamic>> _appointments = [];
  bool _isAdmin = false;

  // Loading
  bool _meetingsLoading = false;
  bool _notesLoading = false;
  bool _appointmentsLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      setState(() => _mainTab = _tabController.index);
      _loadCurrentTab();
    });

    final profile = ref.read(profileProvider).valueOrNull;
    final role = profile?['role']?.toString().toLowerCase() ?? '';
    _isAdmin = role.contains('admin') || role.contains('kurucu') || role.contains('manager');

    _loadMeetings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadCurrentTab() {
    if (_mainTab == 0) {
      _loadMeetings();
    } else if (_mainTab == 1) {
      _loadPrivateNotes();
    } else {
      _loadAppointments();
    }
  }

  Future<void> _loadMeetings() async {
    setState(() => _meetingsLoading = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      final data = await repo.getMeetings();
      if (mounted) setState(() => _meetings = data);
    } catch (e) {
      debugPrint('Meetings loading error: $e');
    } finally {
      if (mounted) setState(() => _meetingsLoading = false);
    }
  }

  Future<void> _loadPrivateNotes() async {
    setState(() => _notesLoading = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      final data = await repo.getPrivateNotes();
      if (mounted) setState(() => _privateNotes = data);
    } catch (e) {
      debugPrint('Notes loading error: $e');
    } finally {
      if (mounted) setState(() => _notesLoading = false);
    }
  }

  Future<void> _loadAppointments() async {
    setState(() => _appointmentsLoading = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      final data = await repo.getAppointments(filter: _appointmentSub);
      if (mounted) setState(() => _appointments = data);
    } catch (e) {
      debugPrint('Appointments loading error: $e');
    } finally {
      if (mounted) setState(() => _appointmentsLoading = false);
    }
  }

  Future<void> _deleteRecord(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Silme Onayı'),
        content: const Text('Bu kaydı silmek istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final repo = ref.read(conversationsRepositoryProvider);
      await repo.deleteMeeting(id);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Kayıt silindi.')));
        _loadCurrentTab();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Silme işlemi başarısız: $e')));
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'planned':
      case 'scheduled':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Tamamlandı';
      case 'planned':
      case 'scheduled':
        return 'Planlandı';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  }

  String _getVisibilityText(String v) {
    switch (v) {
      case 'admin_only':
        return 'Sadece Yöneticiye Özel';
      case 'teachers_open':
        return 'Öğretmenlere Açık';
      case 'public':
        return 'Herkese Açık';
      case 'private':
        return 'Sadece Ben';
      default:
        return v;
    }
  }

  Color _getVisibilityColor(String v) {
    switch (v) {
      case 'admin_only':
        return Colors.orange;
      case 'teachers_open':
        return Colors.blue;
      case 'public':
        return Colors.green;
      case 'private':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _getMeetingWithText(String? mw) {
    switch (mw) {
      case 'student':
        return 'Öğrenci';
      case 'parent':
        return 'Veli';
      default:
        return mw ?? '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Görüşmelerim'),
        actions: [
          IconButton(
            onPressed: () async {
              // Her tab için uygun türde form aç (kampüs filtresi olmadan web gibi)
              final String type;
              if (_mainTab == 1) {
                type = 'note';
              } else if (_mainTab == 2) {
                type = 'appointment';
              } else {
                type = 'meeting';
              }
              await context.push('/conversations/new', extra: type);
              _loadCurrentTab();
            },
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Ekle',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          labelPadding: const EdgeInsets.symmetric(horizontal: 12),
          tabs: const [
            Tab(icon: Icon(Icons.forum_outlined), text: 'Görüşmeler'),
            Tab(icon: Icon(Icons.lock_outline), text: 'Özel Notlar'),
            Tab(icon: Icon(Icons.calendar_month_outlined), text: 'Randevular'),
          ],
        ),
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildMeetingsTab(),
          _buildNotesTab(),
          _buildAppointmentsTab(),
        ],
      ),
    );
  }

  // ==================== Görüşme Kayıtları ====================
  Widget _buildMeetingsTab() {
    return Column(
      children: [
        // Sub-tab: Tümü | Öğrenci Görüşmeleri | Veli Görüşmeleri
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              _buildSubChip(
                'Tümü',
                'all',
                _meetingTypeSub,
                (v) => setState(() => _meetingTypeSub = v),
              ),
              const SizedBox(width: 6),
              _buildSubChip(
                'Öğrenci',
                'student',
                _meetingTypeSub,
                (v) => setState(() => _meetingTypeSub = v),
              ),
              const SizedBox(width: 6),
              _buildSubChip(
                'Veli',
                'parent',
                _meetingTypeSub,
                (v) => setState(() => _meetingTypeSub = v),
              ),
            ],
          ),
        ),
        Expanded(
          child: _meetingsLoading
              ? const Center(child: CircularProgressIndicator())
              : _getFilteredMeetings().isEmpty
              ? _buildEmptyState(
                  Icons.note_alt_outlined,
                  'Seçili kritere uygun görüşme kaydı bulunmuyor.',
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _getFilteredMeetings().length,
                  itemBuilder: (ctx, i) =>
                      _buildMeetingCard(_getFilteredMeetings()[i]),
                ),
        ),
      ],
    );
  }

  List<Map<String, dynamic>> _getFilteredMeetings() {
    if (_meetingTypeSub == 'all') return _meetings;
    return _meetings
        .where((m) => m['meeting_with'] == _meetingTypeSub)
        .toList();
  }

  Widget _buildMeetingCard(Map<String, dynamic> rec) {
    final student = rec['student'] as Map<String, dynamic>?;
    final studentName = student?['name'] ?? '';
    final teacher = rec['teacher'] as Map<String, dynamic>?;
    final teacherName = teacher?['name'] ?? '';
    final classroomLabel = rec['classroom_label'] ?? '';
    final visibility = rec['visibility']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
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
                child: Text(
                  rec['title']?.toString() ?? '',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _buildVisibilityBadge(visibility),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (studentName.isNotEmpty)
                _buildChip(Icons.person, studentName, Colors.blue),
              if (_isAdmin && teacherName.isNotEmpty)
                _buildChip(Icons.record_voice_over, teacherName, Colors.deepOrange),
              if (classroomLabel.isNotEmpty)
                _buildChip(Icons.school, classroomLabel, Colors.grey),
              if (rec['meeting_date'] != null)
                _buildChip(
                  Icons.calendar_today,
                  _formatDate(rec['meeting_date'].toString()),
                  Colors.grey,
                ),
              _buildChip(
                Icons.people,
                _getMeetingWithText(rec['meeting_with']?.toString()),
                Colors.teal,
              ),
            ],
          ),
          if (rec['content'] != null &&
              rec['content'].toString().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              rec['content'].toString(),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              _buildActionBtn(
                Icons.edit,
                'Düzenle',
                Colors.blue,
                () async {
                  await context.push(
                    '/conversations/new',
                    extra: {'meetingId': rec['id'] as int},
                  );
                  _loadCurrentTab();
                },
              ),
              const SizedBox(width: 8),
              _buildActionBtn(
                Icons.delete,
                'Sil',
                Colors.red,
                () => _deleteRecord(rec['id'] as int),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==================== Özel Notlar ====================
  Widget _buildNotesTab() {
    if (_notesLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_privateNotes.isEmpty) {
      return _buildEmptyState(
        Icons.lock,
        'Henüz özel not eklenmemiş.\nBu notlar sadece sizin tarafınızdan görülebilir.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _privateNotes.length,
      itemBuilder: (ctx, i) => _buildMeetingCard(_privateNotes[i]),
    );
  }

  // ==================== Randevularım ====================
  Widget _buildAppointmentsTab() {
    return Column(
      children: [
        // Sub-tab: Bugün | Gelecek | Geçmiş
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: [
              _buildSubChip('Bugün', 'today', _appointmentSub, (v) {
                setState(() => _appointmentSub = v);
                _loadAppointments();
              }),
              const SizedBox(width: 6),
              _buildSubChip('Gelecek', 'upcoming', _appointmentSub, (v) {
                setState(() => _appointmentSub = v);
                _loadAppointments();
              }),
              const SizedBox(width: 6),
              _buildSubChip('Geçmiş', 'past', _appointmentSub, (v) {
                setState(() => _appointmentSub = v);
                _loadAppointments();
              }),
            ],
          ),
        ),
        Expanded(
          child: _appointmentsLoading
              ? const Center(child: CircularProgressIndicator())
              : _appointments.isEmpty
              ? _buildEmptyState(
                  Icons.calendar_today,
                  _getAppointmentEmptyText(),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _appointments.length,
                  itemBuilder: (ctx, i) =>
                      _buildAppointmentCard(_appointments[i]),
                ),
        ),
      ],
    );
  }

  String _getAppointmentEmptyText() {
    switch (_appointmentSub) {
      case 'today':
        return 'Bugün için randevu bulunmuyor.';
      case 'upcoming':
        return 'Gelecek randevu bulunmuyor.';
      case 'past':
        return 'Geçmiş randevu bulunmuyor.';
      default:
        return 'Randevu bulunmuyor.';
    }
  }

  Widget _buildAppointmentCard(Map<String, dynamic> rec) {
    final student = rec['student'] as Map<String, dynamic>?;
    final studentName = student?['name'] ?? '';
    final classroomLabel = rec['classroom_label'] ?? '';
    final status = rec['status']?.toString() ?? 'planned';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            alignment: WrapAlignment.spaceBetween,
            children: [
              if (studentName.isNotEmpty)
                _buildChip(Icons.person, studentName, Colors.blue),
              if (classroomLabel.isNotEmpty)
                _buildChip(Icons.school, classroomLabel, Colors.grey),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(status).withValues(alpha: 0.1),
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
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (rec['meeting_date'] != null)
                _buildChip(
                  Icons.calendar_today,
                  _formatDate(rec['meeting_date'].toString()),
                  Colors.grey,
                ),
              if (rec['meeting_time'] != null &&
                  rec['meeting_time'].toString().isNotEmpty)
                _buildChip(
                  Icons.access_time,
                  rec['meeting_time'].toString(),
                  Colors.grey,
                ),
              _buildChip(
                Icons.people,
                _getMeetingWithText(rec['meeting_with']?.toString()),
                Colors.teal,
              ),
            ],
          ),
          if (rec['content'] != null &&
              rec['content'].toString().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              rec['content'].toString(),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              _buildActionBtn(
                Icons.edit,
                'Düzenle',
                Colors.blue,
                () async {
                  await context.push(
                    '/conversations/new',
                    extra: {'meetingId': rec['id'] as int},
                  );
                  _loadCurrentTab();
                },
              ),
              const SizedBox(width: 8),
              _buildActionBtn(
                Icons.delete,
                'Sil',
                Colors.red,
                () => _deleteRecord(rec['id'] as int),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==================== Helpers ====================
  Widget _buildSubChip(
    String label,
    String value,
    String current,
    ValueChanged<String> onTap,
  ) {
    final active = current == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: active
                ? Theme.of(context).colorScheme.primary
                : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : Colors.grey.shade700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChip(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisibilityBadge(String visibility) {
    final color = _getVisibilityColor(visibility);
    final text = _getVisibilityText(visibility);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildActionBtn(
    IconData icon,
    String label,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String text) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 56, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
