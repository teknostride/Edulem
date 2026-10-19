import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../profile/profile_providers.dart';
import '../schedule/schedule_providers.dart';
import '../students/students_providers.dart';
import 'attendances_daily_page.dart';
import 'attendances_providers.dart';

class AttendancesTakePage extends ConsumerStatefulWidget {
  const AttendancesTakePage({
    super.key,
    this.initialScheduleId,
    this.initialDate,
  });

  final int? initialScheduleId;
  final String? initialDate;

  @override
  ConsumerState<AttendancesTakePage> createState() =>
      _AttendancesTakePageState();
}

class _AttendancesTakePageState extends ConsumerState<AttendancesTakePage> {
  late String _date;
  int? _selectedScheduleId;
  bool _loadingSchedules = false;
  bool _loadingStudents = false;
  bool _submitting = false;

  List<Map<String, dynamic>> _schedules = const [];
  Set<int> _savedScheduleIds = const {};
  List<Map<String, dynamic>> _students = const [];
  final Map<int, String> _statusByStudentId = {};

  @override
  void initState() {
    super.initState();
    _date = widget.initialDate ?? _todayIso();
    _selectedScheduleId = widget.initialScheduleId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadSchedules(preferredScheduleId: _selectedScheduleId);
    });
  }

  String _todayIso() {
    final now = DateTime.now();
    return '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  String _dayOfWeekFromDate(String isoDate) {
    // JS getDay mapping: 0=Sun..6=Sat; backend expects english lowercase
    final d = DateTime.tryParse('${isoDate}T12:00:00');
    if (d == null) return '';
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[d.weekday % 7];
  }

  Future<void> _loadSchedules({int? preferredScheduleId}) async {
    setState(() {
      _loadingSchedules = true;
    });

    try {
      final dayOfWeek = _dayOfWeekFromDate(_date);
      final profile = await ref.read(profileProvider.future);
      final teacherId = int.tryParse(profile['id']?.toString() ?? '');

      if (teacherId == null) {
        setState(() {
          _schedules = const [];
          _savedScheduleIds = const {};
        });
        return;
      }

      final scheduleRepo = ref.read(scheduleRepositoryProvider);
      final attendancesRepo = ref.read(attendancesRepositoryProvider);

      // Öğretmenin kendi ders programını çek
      final teacherSchedules = await scheduleRepo.listForTeacher(teacherId);

      // Seçilen güne göre filtrele
      final targetDay = dayOfWeek.toLowerCase();
      final schedules = teacherSchedules.where((s) {
        final sDay = s['day_of_week']?.toString().toLowerCase() ?? '';
        final sDayNormalized = sDay
            .replaceAll('i̇', 'i')
            .replaceAll('ı', 'i')
            .replaceAll('ç', 'c')
            .replaceAll('ş', 's')
            .replaceAll('ğ', 'g')
            .replaceAll('ü', 'u')
            .replaceAll('ö', 'o');
        final targetNormalized = targetDay
            .replaceAll('i̇', 'i')
            .replaceAll('ı', 'i')
            .replaceAll('ç', 'c')
            .replaceAll('ş', 's')
            .replaceAll('ğ', 'g')
            .replaceAll('ü', 'u')
            .replaceAll('ö', 'o');
        return sDay == targetDay ||
            sDayNormalized == targetNormalized ||
            sDay.contains(targetDay) ||
            targetDay.contains(sDay);
      }).toList();

      // Determine already-saved schedules from daily tracking endpoint.
      final dailyRes = await attendancesRepo.daily(date: _date);
      final raw = (dailyRes['data'] is Map)
          ? Map<String, dynamic>.from(dailyRes['data'] as Map)
          : dailyRes;
      final dersler = raw['dersler'] is List
          ? raw['dersler'] as List
          : <dynamic>[];
      final savedIds = dersler
          .whereType<Map>()
          .where((d) => d['yoklama_alindi'] == true)
          .map((d) => int.tryParse(d['schedule_id']?.toString() ?? '') ?? 0)
          .where((id) => id > 0)
          .toSet();

      schedules.sort((a, b) {
        final t1 = a['start_time']?.toString() ?? '';
        final t2 = b['start_time']?.toString() ?? '';
        return t1.compareTo(t2);
      });

      if (preferredScheduleId != null &&
          !schedules.any(
            (s) =>
                (int.tryParse(s['id']?.toString() ?? '') ?? 0) ==
                preferredScheduleId,
          )) {
        try {
          final specific = await scheduleRepo.getById(preferredScheduleId);
          if (specific.isNotEmpty) {
            schedules.add(specific);
          }
        } catch (_) {}
      }

      int? nextScheduleId;
      if (preferredScheduleId != null &&
          schedules.any(
            (s) =>
                (int.tryParse(s['id']?.toString() ?? '') ?? 0) ==
                preferredScheduleId,
          )) {
        nextScheduleId = preferredScheduleId;
      } else if (schedules.isNotEmpty) {
        nextScheduleId = int.tryParse(schedules.first['id']?.toString() ?? '');
      }

      if (mounted) {
        setState(() {
          _schedules = schedules;
          _savedScheduleIds = savedIds;
          _selectedScheduleId = nextScheduleId;
        });
      }

      if (nextScheduleId != null) {
        await _onScheduleSelected(nextScheduleId);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _schedules = const [];
          _savedScheduleIds = const {};
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingSchedules = false;
        });
      }
    }
  }

  Future<void> _onScheduleSelected(int scheduleId) async {
    final schedule = _schedules.firstWhere(
      (s) => (int.tryParse(s['id']?.toString() ?? '') ?? 0) == scheduleId,
      orElse: () => const <String, dynamic>{},
    );

    final classroomId =
        int.tryParse(schedule['classroom_id']?.toString() ?? '') ??
        int.tryParse(schedule['classroom']?['id']?.toString() ?? '') ??
        0;

    if (classroomId <= 0) {
      if (mounted) {
        setState(() {
          _students = const [];
          _statusByStudentId.clear();
        });
      }
      return;
    }

    setState(() {
      _loadingStudents = true;
      _selectedScheduleId = scheduleId;
      _students = const [];
      _statusByStudentId.clear();
    });

    try {
      final studentsRepo = ref.read(studentsRepositoryProvider);
      final attendancesRepo = ref.read(attendancesRepositoryProvider);

      final existing = await attendancesRepo.listForScheduleAndDate(
        scheduleId: scheduleId,
        date: _date,
      );

      final existingByStudent = <int, String>{};
      for (final a in existing) {
        final sid =
            int.tryParse(a['student_id']?.toString() ?? '') ??
            int.tryParse(a['student']?['id']?.toString() ?? '') ??
            0;
        final st = _normalizeStatus(a['status']);
        if (sid > 0) existingByStudent[sid] = st;
      }

      final res = await studentsRepo.list(
        page: 1,
        perPage: 100,
        classroomId: classroomId,
      );

      final items = (res['items'] is List)
          ? (res['items'] as List)
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
          : const <Map<String, dynamic>>[];

      // default status = present if not found
      for (final s in items) {
        final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
        if (sid <= 0) continue;
        _statusByStudentId[sid] = existingByStudent[sid] ?? 'present';
      }

      if (mounted) {
        setState(() {
          _students = items;
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingStudents = false;
        });
      }
    }
  }

  String _normalizeStatus(dynamic raw) {
    final v = raw?.toString().trim().toLowerCase() ?? '';
    const map = {
      'present': 'present',
      'geldi': 'present',
      'absent': 'absent',
      'gelmedi': 'absent',
      'late': 'late',
      'gc': 'late',
      'gec': 'late',
      'excused': 'excused',
      'izinli': 'excused',
      'sick': 'sick',
      'raporlu': 'sick',
    };
    return map[v] ?? 'present';
  }

  Future<void> _submit() async {
    final scheduleId = _selectedScheduleId;
    if (scheduleId == null) return;
    if (_students.isEmpty) return;

    setState(() {
      _submitting = true;
    });

    try {
      final attendancesRepo = ref.read(attendancesRepositoryProvider);
      await attendancesRepo.bulkStore(
        scheduleId: scheduleId,
        date: _date,
        attendances: _students
            .map((s) {
              final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
              return {
                'student_id': sid,
                'status': _statusByStudentId[sid] ?? 'present',
                'notes': '',
              };
            })
            .where((a) => (a['student_id'] as int) > 0)
            .toList(),
      );

      if (mounted) {
        setState(() {
          _savedScheduleIds = {..._savedScheduleIds, scheduleId};
        });
        // Günlük yoklama verisini yenile
        ref.invalidate(attendancesDailyProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Yoklama kaydedildi'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );
        if (context.canPop()) {
          context.pop(true);
        } else {
          context.go('/attendances');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Yoklama kaydedilemedi: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheduleId = _selectedScheduleId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yoklama Al'),
        actions: [
          IconButton(
            onPressed: _submitting ? null : _submit,
            icon: const Icon(Icons.check),
            tooltip: 'Yoklamayı Tamamla',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                const SizedBox(height: 12),
                Builder(
                  builder: (context) {
                    // Validate that current scheduleId exists in the list
                    final validScheduleIds = _schedules
                        .map(
                          (s) => int.tryParse(s['id']?.toString() ?? '') ?? 0,
                        )
                        .where((id) => id > 0)
                        .toSet();

                    final effectiveValue =
                        (scheduleId != null &&
                            validScheduleIds.contains(scheduleId))
                        ? scheduleId
                        : null;

                    return DropdownButtonFormField<int>(
                      initialValue: effectiveValue,
                      decoration: const InputDecoration(
                        labelText: 'Ders / Sınıf Seçimi',
                        border: OutlineInputBorder(),
                      ),
                      items: _schedules.isEmpty
                          ? const [
                              DropdownMenuItem<int>(
                                value: null,
                                child: Text('Bu güne ait ders bulunamadı'),
                              ),
                            ]
                          : _schedules.map((s) {
                              final id =
                                  int.tryParse(s['id']?.toString() ?? '') ?? 0;
                              final start = (s['start_time']?.toString() ?? '')
                                  .padRight(5)
                                  .substring(0, 5);
                              final classroom =
                                  s['classroom_name']?.toString() ??
                                  s['classroom']?['name']?.toString() ??
                                  '';
                              final lesson =
                                  s['lesson_name']?.toString() ??
                                  s['lesson']?['name']?.toString() ??
                                  '';
                              final saved = _savedScheduleIds.contains(id);
                              final label =
                                  '$start - $classroom ($lesson)${saved ? ' ✅' : ''}';
                              return DropdownMenuItem<int>(
                                value: id,
                                child: Text(
                                  label,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              );
                            }).toList(),
                      onChanged: _loadingSchedules
                          ? null
                          : (val) {
                              if (val == null) return;
                              _onScheduleSelected(val);
                            },
                    );
                  },
                ),
                if (scheduleId != null &&
                    _savedScheduleIds.contains(scheduleId))
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Bu dersin yoklaması kaydedildi. Güncelleyebilirsiniz.',
                        style: TextStyle(color: Colors.green),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _loadingSchedules || _loadingStudents
                ? const Center(child: CircularProgressIndicator())
                : _students.isEmpty
                ? const Center(
                    child: Text('Seçili derse ait öğrenci bulunamadı.'),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _students.length,
                    itemBuilder: (context, index) {
                      final s = _students[index];
                      final sid = int.tryParse(s['id']?.toString() ?? '') ?? 0;
                      final name = s['name']?.toString() ?? 'Öğrenci';
                      final no =
                          s['student_number']?.toString() ??
                          s['school_no']?.toString() ??
                          '-';
                      final status = _statusByStudentId[sid] ?? 'present';

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              // Student number on the left
                              Container(
                                width: 32,
                                alignment: Alignment.center,
                                child: Text(
                                  no,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Student name in the middle
                              Expanded(
                                child: Text(
                                  name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Status button on the right of name
                              _buildStatusButton(sid, status),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (_submitting || _students.isEmpty)
                      ? null
                      : _submit,
                  child: Text(
                    _submitting ? 'Kaydediliyor...' : 'Yoklamayı Tamamla',
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getNextStatus(String currentStatus) {
    const order = ['present', 'absent', 'late', 'excused', 'sick'];
    final normalized = _normalizeStatus(currentStatus);
    final index = order.indexOf(normalized);
    if (index == -1 || index == order.length - 1) {
      return order.first;
    }
    return order[index + 1];
  }

  Widget _buildStatusButton(int studentId, String currentStatus) {
    final normalized = _normalizeStatus(currentStatus);
    String label;
    Color color;
    switch (normalized) {
      case 'present':
        label = 'Geldi';
        color = Colors.green;
        break;
      case 'late':
        label = 'Geç';
        color = Colors.amber;
        break;
      case 'excused':
        label = 'İzinli';
        color = Colors.blue;
        break;
      case 'sick':
        label = 'Raporlu';
        color = Colors.purple;
        break;
      case 'absent':
        label = 'Gelmedi';
        color = Colors.red;
        break;
      default:
        label = 'Geldi';
        color = Colors.green;
    }
    return ElevatedButton(
      onPressed: () => _setStatus(studentId, _getNextStatus(currentStatus)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      ),
    );
  }

  void _setStatus(int studentId, String status) {
    setState(() {
      _statusByStudentId[studentId] = _normalizeStatus(status);
    });
  }
}
