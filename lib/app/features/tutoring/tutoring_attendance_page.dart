import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'tutoring_paging_controller.dart';
import 'tutoring_providers.dart';
import 'tutoring_sms_sheet.dart';

class TutoringAttendancePage extends ConsumerStatefulWidget {
  const TutoringAttendancePage({
    super.key,
    required this.sessionId,
  });

  final int sessionId;

  @override
  ConsumerState<TutoringAttendancePage> createState() =>
      _TutoringAttendancePageState();
}

class _TutoringAttendancePageState
    extends ConsumerState<TutoringAttendancePage> {
  Map<String, dynamic>? _session;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  List<Map<String, dynamic>> _students = [];
  final Map<int, String> _statusByStudentId = {};
  final Map<int, String> _notesByStudentId = {};

  String _filter = 'all'; // 'all', 'present', 'absent', 'late'
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repo = ref.read(tutoringRepositoryProvider);
      final data = await repo.getById(widget.sessionId);

      final List<Map<String, dynamic>> students = data['students'] is List
          ? (data['students'] as List)
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList()
          : [];

      // Existing attendances map
      final Map<int, Map<String, dynamic>> existingAtts = {};
      if (data['attendances'] is List) {
        for (final a in data['attendances'] as List) {
          if (a is Map) {
            final sid = int.tryParse(a['student_id']?.toString() ?? '');
            if (sid != null) {
              existingAtts[sid] = Map<String, dynamic>.from(a);
            }
          }
        }
      }

      final hasPriorAttendance = existingAtts.isNotEmpty;

      // Populate status
      for (final s in students) {
        final sid = int.tryParse(s['id']?.toString() ?? '');
        if (sid == null) continue;

        if (existingAtts.containsKey(sid)) {
          _statusByStudentId[sid] =
              existingAtts[sid]!['status']?.toString() ?? 'present';
          final note = existingAtts[sid]!['notes']?.toString();
          if (note != null && note.isNotEmpty) {
            _notesByStudentId[sid] = note;
          }
        } else {
          // If already taken, default unrecorded to absent, else default all to present
          _statusByStudentId[sid] = hasPriorAttendance ? 'absent' : 'present';
        }
      }

      if (mounted) {
        setState(() {
          _session = data;
          _students = students;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  void _markAll(String status) {
    setState(() {
      for (final s in _students) {
        final sid = int.tryParse(s['id']?.toString() ?? '');
        if (sid != null) {
          _statusByStudentId[sid] = status;
        }
      }
    });
  }

  Future<void> _saveAttendance() async {
    if (_students.isEmpty) return;

    setState(() => _saving = true);

    try {
      final payload = _students.map((s) {
        final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
        final status = _statusByStudentId[sid] ?? 'present';
        final notes = _notesByStudentId[sid];
        return {
          'student_id': sid,
          'status': status,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        };
      }).toList();

      final repo = ref.read(tutoringRepositoryProvider);
      await repo.bulkAttendance(widget.sessionId, payload);

      // Invalidate list paging provider to refresh status in parent list
      ref.invalidate(tutoringPagingProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Colors.green,
            content: Text('Yoklama başarıyla kaydedildi!'),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.red,
            content: Text('Yoklama kaydedilirken hata oluştu: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showNoteDialog(int studentId, String studentName) {
    final controller =
        TextEditingController(text: _notesByStudentId[studentId] ?? '');

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$studentName - Not Ekle'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Yoklama ile ilgili not girin (isteğe bağlı)...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                final text = controller.text.trim();
                if (text.isEmpty) {
                  _notesByStudentId.remove(studentId);
                } else {
                  _notesByStudentId[studentId] = text;
                }
              });
              Navigator.pop(ctx);
            },
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _session?['title']?.toString() ?? 'Etüt Yoklaması';
    final lesson = _session?['lesson'] is Map
        ? _session!['lesson']['name']?.toString()
        : null;
    final date = _session?['date']?.toString() ?? '';
    final startTime = _session?['start_time']?.toString() ?? '';
    final endTime = _session?['end_time']?.toString() ?? '';

    // Calculate real-time counts
    int totalCount = _students.length;
    int presentCount = 0;
    int absentCount = 0;
    int lateCount = 0;

    for (final s in _students) {
      final sid = int.tryParse(s['id']?.toString() ?? '');
      if (sid != null) {
        final status = _statusByStudentId[sid] ?? 'present';
        if (status == 'present') presentCount++;
        if (status == 'absent') absentCount++;
        if (status == 'late') lateCount++;
      }
    }

    final rate =
        totalCount > 0 ? ((presentCount / totalCount) * 100).round() : 0;

    // Filter students
    final filteredStudents = _students.where((s) {
      final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
      final status = _statusByStudentId[sid] ?? 'present';

      if (_filter != 'all' && status != _filter) return false;

      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        final name = (s['name'] ??
                '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}')
            .toString()
            .toLowerCase();
        final no = (s['student_number'] ?? s['school_no'] ?? '')
            .toString()
            .toLowerCase();
        return name.contains(q) || no.contains(q);
      }

      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16)),
            Text(
              '${lesson != null ? "$lesson • " : ""}$date${startTime.isNotEmpty ? " ($startTime-$endTime)" : ""}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          if (_session != null)
            IconButton(
              icon: const Icon(Icons.sms_outlined),
              tooltip: 'SMS Gönder',
              onPressed: () {
                TutoringSmsSheet.show(
                  context,
                  session: _session!,
                  initialStudents: _students,
                );
              },
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Hata: $_error', textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadSession,
                    child: const Text('Tekrar Dene'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // Top Statistics Card
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 12),
                  color: Colors.white,
                  child: Row(
                    children: [
                      _buildStatItem('Toplam', '$totalCount', Colors.grey.shade800),
                      _buildStatItem('Geldi', '$presentCount', Colors.green),
                      _buildStatItem('Gelmedi', '$absentCount', Colors.red),
                      _buildStatItem('Geç', '$lateCount', Colors.orange),
                      _buildStatItem('Katılım', '%$rate', Colors.blue.shade700),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Quick Controls: Filter chips + All Mark
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: Colors.white,
                  child: Column(
                    children: [
                      // Search and All actions row
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 38,
                              child: TextField(
                                onChanged: (v) => setState(() => _search = v),
                                decoration: InputDecoration(
                                  hintText: 'Öğrenci veya No ara...',
                                  prefixIcon: const Icon(Icons.search, size: 18),
                                  contentPadding:
                                      const EdgeInsets.symmetric(vertical: 0),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide:
                                        BorderSide(color: Colors.grey.shade300),
                                  ),
                                  filled: true,
                                  fillColor: Colors.grey.shade50,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          PopupMenuButton<String>(
                            tooltip: 'Hızlı İşlemler',
                            icon: const Icon(Icons.more_horiz, size: 22),
                            onSelected: (val) {
                              if (val == 'all_present') _markAll('present');
                              if (val == 'all_absent') _markAll('absent');
                            },
                            itemBuilder: (ctx) => [
                              const PopupMenuItem(
                                value: 'all_present',
                                child: Row(
                                  children: [
                                    Icon(Icons.done_all,
                                        color: Colors.green, size: 18),
                                    SizedBox(width: 8),
                                    Text('Hepsini Geldi Yap'),
                                  ],
                                ),
                              ),
                              const PopupMenuItem(
                                value: 'all_absent',
                                child: Row(
                                  children: [
                                    Icon(Icons.close,
                                        color: Colors.red, size: 18),
                                    SizedBox(width: 8),
                                    Text('Hepsini Gelmedi Yap'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Filter chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildFilterChip('all', 'Tümü ($totalCount)'),
                            const SizedBox(width: 8),
                            _buildFilterChip('present', 'Geldi ($presentCount)'),
                            const SizedBox(width: 8),
                            _buildFilterChip('absent', 'Gelmedi ($absentCount)'),
                            const SizedBox(width: 8),
                            _buildFilterChip('late', 'Geç ($lateCount)'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Student Attendance List
                Expanded(
                  child: filteredStudents.isEmpty
                      ? Center(
                          child: Text(
                            _students.isEmpty
                                ? 'Bu oturuma kayıtlı öğrenci bulunmuyor.'
                                : 'Filtreye uygun öğrenci bulunamadı.',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: filteredStudents.length,
                          itemBuilder: (context, index) {
                            final s = filteredStudents[index];
                            final sid =
                                int.tryParse(s['id']?.toString() ?? '') ?? 0;
                            final name = s['name']?.toString() ??
                                '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}'
                                    .trim();
                            final no = s['student_number']?.toString() ??
                                s['school_no']?.toString() ??
                                '';
                            final classroom = s['classroom'] is Map
                                ? s['classroom']['name']?.toString()
                                : s['classroom_name']?.toString();

                            final currentStatus =
                                _statusByStudentId[sid] ?? 'present';
                            final hasNote = _notesByStudentId.containsKey(sid);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: currentStatus == 'present'
                                      ? Colors.green.shade100
                                      : currentStatus == 'absent'
                                          ? Colors.red.shade100
                                          : Colors.orange.shade100,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      // School No badge
                                      if (no.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 2),
                                          margin:
                                              const EdgeInsets.only(right: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.grey.shade100,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            no,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),

                                      // Student name
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              name.isEmpty
                                                  ? 'Öğrenci #$sid'
                                                  : name,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            if (classroom != null)
                                              Text(
                                                classroom,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: Colors.grey.shade500,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),

                                      // Note Button
                                      IconButton(
                                        icon: Icon(
                                          hasNote
                                              ? Icons.comment
                                              : Icons.add_comment_outlined,
                                          size: 18,
                                          color: hasNote
                                              ? Colors.blue.shade700
                                              : Colors.grey.shade400,
                                        ),
                                        tooltip: 'Not Ekle/Düzenle',
                                        onPressed: () =>
                                            _showNoteDialog(sid, name),
                                      ),
                                    ],
                                  ),

                                  if (hasNote) ...[
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        'Not: ${_notesByStudentId[sid]!}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.blue.shade900,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 8),

                                  // Status Selection Buttons
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _buildStatusSelectBtn(
                                          label: 'Geldi',
                                          icon: Icons.check,
                                          status: 'present',
                                          activeColor: Colors.green,
                                          isSelected:
                                              currentStatus == 'present',
                                          onTap: () {
                                            setState(() {
                                              _statusByStudentId[sid] =
                                                  'present';
                                            });
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: _buildStatusSelectBtn(
                                          label: 'Gelmedi',
                                          icon: Icons.close,
                                          status: 'absent',
                                          activeColor: Colors.red,
                                          isSelected: currentStatus == 'absent',
                                          onTap: () {
                                            setState(() {
                                              _statusByStudentId[sid] =
                                                  'absent';
                                            });
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: _buildStatusSelectBtn(
                                          label: 'Geç',
                                          icon: Icons.access_time,
                                          status: 'late',
                                          activeColor: Colors.orange,
                                          isSelected: currentStatus == 'late',
                                          onTap: () {
                                            setState(() {
                                              _statusByStudentId[sid] = 'late';
                                            });
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),

                // Save Bottom Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed:
                            _saving || _students.isEmpty ? null : _saveAttendance,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: Text(
                          _saving
                              ? 'Kaydediliyor...'
                              : 'Yoklamayı Kaydet ($presentCount/$totalCount Geldi)',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _filter == filterKey;
    return InkWell(
      onTap: () => setState(() => _filter = filterKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.shade700 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusSelectBtn({
    required String label,
    required IconData icon,
    required String status,
    required Color activeColor,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? activeColor : Colors.grey.shade300,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? Colors.white : Colors.grey.shade600,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? Colors.white : Colors.grey.shade700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
