import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import 'tutoring_attendance_page.dart';
import 'tutoring_providers.dart';
import 'tutoring_sms_sheet.dart';

class TutoringDetailSheet extends ConsumerStatefulWidget {
  const TutoringDetailSheet({
    super.key,
    required this.sessionId,
    this.initialData,
  });

  final int sessionId;
  final Map<String, dynamic>? initialData;

  static Future<void> show(
    BuildContext context, {
    required int sessionId,
    Map<String, dynamic>? initialData,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => TutoringDetailSheet(
        sessionId: sessionId,
        initialData: initialData,
      ),
    );
  }

  @override
  ConsumerState<TutoringDetailSheet> createState() =>
      _TutoringDetailSheetState();
}

class _TutoringDetailSheetState extends ConsumerState<TutoringDetailSheet> {
  Map<String, dynamic>? _session;
  bool _loading = true;
  String? _error;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null) {
      _session = widget.initialData;
      _loading = false;
    }
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    try {
      final repo = ref.read(tutoringRepositoryProvider);
      final data = await repo.getById(widget.sessionId);
      if (mounted) {
        setState(() {
          _session = data;
          _loading = false;
          _error = null;
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

  Future<void> _makePhoneCall(String phoneNumber) async {
    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 12, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.school, color: Colors.blue.shade700),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session?['title']?.toString() ?? 'Etüt Detayı',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'ID: #${widget.sessionId}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Body
          Expanded(
            child: _loading && session == null
                ? const Center(child: CircularProgressIndicator())
                : _error != null && session == null
                ? Center(child: Text('Hata: $_error'))
                : _buildContent(session!),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(Map<String, dynamic> session) {
    final lesson = session['lesson'] is Map
        ? session['lesson']['name']?.toString()
        : '---';
    final teacher = session['teacher'] is Map
        ? session['teacher']['name']?.toString()
        : '---';
    final date = session['date']?.toString() ?? '---';
    final startTime = session['start_time']?.toString() ?? '';
    final endTime = session['end_time']?.toString() ?? '';
    final room = session['room']?.toString() ?? '---';
    final description = session['description']?.toString() ?? '';

    // Attendance summary
    final attSummary = session['attendance_summary'] is Map
        ? Map<String, dynamic>.from(session['attendance_summary'] as Map)
        : null;
    final isTaken = attSummary?['taken'] == true;
    final attRate = attSummary?['rate']?.toString() ?? '0';
    final present = attSummary?['present']?.toString() ?? '0';
    final absent = attSummary?['absent']?.toString() ?? '0';
    final lateCount = attSummary?['late']?.toString() ?? '0';

    // Students list
    final List<Map<String, dynamic>> rawStudents = session['students'] is List
        ? (session['students'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : [];

    // Attendances map
    final Map<int, String> attendanceByStudent = {};
    if (session['attendances'] is List) {
      for (final a in session['attendances'] as List) {
        if (a is Map) {
          final sId = int.tryParse(a['student_id']?.toString() ?? '');
          if (sId != null && a['status'] != null) {
            attendanceByStudent[sId] = a['status'].toString();
          }
        }
      }
    }

    final filteredStudents = rawStudents.where((s) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (s['name'] ?? '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}').toString().toLowerCase();
      final no = (s['student_number'] ?? s['school_no'] ?? '').toString().toLowerCase();
      return name.contains(q) || no.contains(q);
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Meta Info Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildMetaRow(Icons.book_outlined, 'Ders', lesson ?? '---'),
              const SizedBox(height: 8),
              _buildMetaRow(Icons.person_outline, 'Öğretmen', teacher ?? '---'),
              const SizedBox(height: 8),
              _buildMetaRow(Icons.calendar_today_outlined, 'Tarih', date),
              const SizedBox(height: 8),
              if (startTime.isNotEmpty)
                _buildMetaRow(Icons.access_time, 'Saat', '$startTime - $endTime'),
              if (startTime.isNotEmpty) const SizedBox(height: 8),
              _buildMetaRow(Icons.meeting_room_outlined, 'Salon/Oda', room),
              if (description.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Attendance Status Banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isTaken ? Colors.green.shade50 : Colors.amber.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isTaken ? Colors.green.shade200 : Colors.amber.shade200,
            ),
          ),
          child: Row(
            children: [
              Icon(
                isTaken ? Icons.check_circle : Icons.pending_actions,
                color: isTaken ? Colors.green.shade700 : Colors.amber.shade800,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isTaken ? 'Yoklama Alındı (%$attRate Katılım)' : 'Yoklama Henüz Alınmadı',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isTaken ? Colors.green.shade900 : Colors.amber.shade900,
                      ),
                    ),
                    if (isTaken)
                      Text(
                        'Gelen: $present • Gelmeyen: $absent • Geç: $lateCount',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.green.shade800,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Action Buttons Row
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () async {
                  Navigator.pop(context);
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (ctx) => TutoringAttendancePage(
                        sessionId: widget.sessionId,
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isTaken ? Colors.teal : Colors.blue.shade700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: Icon(isTaken ? Icons.edit_note : Icons.fact_check),
                label: Text(
                  isTaken ? 'Yoklamayı Güncelle' : 'Yoklama Al',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton.icon(
              onPressed: () {
                TutoringSmsSheet.show(
                  context,
                  session: session,
                  initialStudents: rawStudents,
                );
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              icon: const Icon(Icons.sms_outlined),
              label: const Text('SMS'),
            ),
          ],
        ),

        const SizedBox(height: 24),

        // Student List Section Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Kayıtlı Öğrenciler (${rawStudents.length})',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Search Bar
        TextField(
          onChanged: (v) => setState(() => _searchQuery = v),
          decoration: InputDecoration(
            hintText: 'Öğrenci veya No ara...',
            prefixIcon: const Icon(Icons.search, size: 20),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            filled: true,
            fillColor: Colors.grey.shade50,
          ),
        ),
        const SizedBox(height: 12),

        // Students list
        if (filteredStudents.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24),
            alignment: Alignment.center,
            child: Text(
              _searchQuery.isNotEmpty
                  ? 'Aramaya uygun öğrenci bulunamadı.'
                  : 'Bu oturuma kayıtlı öğrenci bulunmuyor.',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          )
        else
          ...filteredStudents.map((s) {
            final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
            final name = s['name']?.toString() ??
                '${s['first_name'] ?? ''} ${s['last_name'] ?? ''}'.trim();
            final no = s['student_number']?.toString() ??
                s['school_no']?.toString() ??
                '';
            final classroom = s['classroom'] is Map
                ? s['classroom']['name']?.toString()
                : s['classroom_name']?.toString();

            // Guardian info
            String? guardianName;
            String? guardianPhone;
            if (s['guardians'] is List && (s['guardians'] as List).isNotEmpty) {
              final g = (s['guardians'] as List).first as Map;
              guardianName = g['name']?.toString();
              guardianPhone = g['phone']?.toString();
            }

            // Attendance badge
            final status = attendanceByStudent[sid];
            Widget? statusBadge;
            if (status != null) {
              Color badgeColor;
              String badgeText;
              switch (status.toLowerCase()) {
                case 'present':
                  badgeColor = Colors.green;
                  badgeText = 'Geldi';
                  break;
                case 'absent':
                  badgeColor = Colors.red;
                  badgeText = 'Gelmedi';
                  break;
                case 'late':
                  badgeColor = Colors.orange;
                  badgeText = 'Geç';
                  break;
                default:
                  badgeColor = Colors.grey;
                  badgeText = status;
              }
              statusBadge = Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                  ),
                ),
              );
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.blue.shade50,
                    foregroundColor: Colors.blue.shade800,
                    radius: 20,
                    child: Text(
                      name.isNotEmpty ? name[0].toUpperCase() : '?',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                name.isEmpty ? 'Öğrenci #$sid' : name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            if (statusBadge != null) statusBadge,
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${no.isNotEmpty ? "No: $no • " : ""}${classroom ?? ""}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        if (guardianName != null || guardianPhone != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(Icons.family_restroom,
                                  size: 14, color: Colors.grey.shade500),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  '${guardianName ?? "Veli"}: ${guardianPhone ?? ""}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade600,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (guardianPhone != null &&
                                  guardianPhone.isNotEmpty)
                                InkWell(
                                  onTap: () => _makePhoneCall(guardianPhone!),
                                  child: Padding(
                                    padding: const EdgeInsets.all(4.0),
                                    child: Icon(Icons.phone,
                                        size: 16, color: Colors.green.shade700),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildMetaRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade500),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
