import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/navigation/app_drawer.dart';
import '../../ui/navigation/drawer_sections_provider.dart';
import '../../features/profile/profile_providers.dart';
import '../../core/network/api_client_provider.dart';
import '../../features/auth/auth_providers.dart';

class DutySchedule {
  final int id;
  final int userId;
  final int? campusId;
  final int? educationLevelId;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String? location;
  final bool isActive;
  final Teacher? user;

  DutySchedule({
    required this.id,
    required this.userId,
    this.campusId,
    this.educationLevelId,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.location,
    required this.isActive,
    this.user,
  });

  factory DutySchedule.fromJson(Map<String, dynamic> json) {
    return DutySchedule(
      id: json['id'] ?? 0,
      userId: json['user_id'] ?? 0,
      campusId: json['campus_id'],
      educationLevelId: json['education_level_id'],
      dayOfWeek: json['day_of_week'] ?? 1,
      startTime: json['start_time']?.toString() ?? '08:00',
      endTime: json['end_time']?.toString() ?? '17:00',
      location: json['location']?.toString(),
      isActive: json['is_active'] ?? true,
      user: json['user'] != null
          ? Teacher.fromJson(Map<String, dynamic>.from(json['user']))
          : null,
    );
  }
}

class Teacher {
  final int id;
  final String firstName;
  final String lastName;

  Teacher({required this.id, required this.firstName, required this.lastName});

  factory Teacher.fromJson(Map<String, dynamic> json) {
    return Teacher(
      id: json['id'] ?? 0,
      firstName: json['first_name']?.toString() ?? '',
      lastName: json['last_name']?.toString() ?? '',
    );
  }

  String get fullName => '$firstName $lastName'.trim();
}

class DutySchedulePage extends ConsumerStatefulWidget {
  const DutySchedulePage({super.key});

  @override
  ConsumerState<DutySchedulePage> createState() => _DutySchedulePageState();
}

class _DutySchedulePageState extends ConsumerState<DutySchedulePage> {
  List<DutySchedule> _schedules = [];
  List<Teacher> _teachers = [];
  // ignore: unused_field
  List<Map<String, dynamic>> _campuses = [];
  // ignore: unused_field
  List<Map<String, dynamic>> _educationLevels = [];
  List<String> _locations = [];

  bool _loading = false;

  int? _selectedCampusId;
  int? _selectedEducationLevelId;

  final List<Map<String, dynamic>> _days = [
    {'id': 1, 'label': 'Pazartesi'},
    {'id': 2, 'label': 'Salı'},
    {'id': 3, 'label': 'Çarşamba'},
    {'id': 4, 'label': 'Perşembe'},
    {'id': 5, 'label': 'Cuma'},
  ];

  bool get _canEdit {
    final session = ref.read(authSessionProvider).valueOrNull;
    final role = session?.role.toLowerCase() ?? '';
    return role.contains('owner') ||
        role.contains('admin') ||
        role.contains('müdür') ||
        role.contains('mudur') ||
        role.contains('öğrenci işleri') ||
        role.contains('ogrenci isleri');
  }

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  int? _getCurrentUserId() {
    final session = ref.read(authSessionProvider).valueOrNull;
    if (session == null) return null;
    final profile = session.profile;
    // Extract user ID from profile
    final id =
        profile['id'] ??
        profile['user']?['id'] ??
        profile['data']?['id'] ??
        profile['user_id'];
    if (id is int) return id;
    if (id is String) return int.tryParse(id);
    return null;
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);

      List<Map<String, dynamic>> campusesRaw = [];
      List<Map<String, dynamic>> levelsRaw = [];
      List<Teacher> teachers = [];

      // Admin mode: fetch campuses, levels, teachers for CRUD
      if (_canEdit) {
        final campusesRes = await api.getJson(
          '/campuses',
          queryParameters: {'per_page': '200'},
        );
        campusesRaw = _extractList(campusesRes, 'campuses');

        final levelsParams = <String, String>{'per_page': '200'};
        if (_selectedCampusId != null) {
          levelsParams['campus_id'] = _selectedCampusId.toString();
        }
        final levelsRes = await api.getJson(
          '/education-levels',
          queryParameters: levelsParams,
        );
        levelsRaw = _extractList(levelsRes, 'education_levels');

        final teachersParams = <String, String>{
          'duty_assignable': '1',
          'per_page': '200',
        };
        if (_selectedCampusId != null) {
          teachersParams['campus_id'] = _selectedCampusId.toString();
        }
        if (_selectedEducationLevelId != null) {
          teachersParams['education_level_id'] = _selectedEducationLevelId
              .toString();
        }
        final teachersRes = await api.getJson(
          '/users',
          queryParameters: teachersParams,
        );
        teachers = _normalizeTeachers(teachersRes);
      }

      // Fetch schedules: admin filters by campus/level, teacher gets only own duties
      List<DutySchedule> fetchedSchedules = [];
      final schedulesParams = <String, String>{'per_page': '500'};
      if (_canEdit) {
        // Admin: filter by selected campus/level
        if (_selectedCampusId != null) {
          schedulesParams['campus_id'] = _selectedCampusId.toString();
        }
        if (_selectedEducationLevelId != null) {
          schedulesParams['education_level_id'] = _selectedEducationLevelId
              .toString();
        }
      } else {
        // Teacher: only fetch own duties
        final currentUserId = _getCurrentUserId();
        if (currentUserId != null) {
          schedulesParams['user_id'] = currentUserId.toString();
        }
      }
      final schedulesRes = await api.getJson(
        '/duty-schedules',
        queryParameters: schedulesParams,
      );
      final schedulesRaw = _extractList(schedulesRes, 'items');
      fetchedSchedules = schedulesRaw
          .map((s) => DutySchedule.fromJson(s))
          .toList();

      setState(() {
        if (_canEdit) {
          _campuses = campusesRaw;
          _educationLevels = levelsRaw;
          _teachers = teachers;
        }
        _schedules = fetchedSchedules;
        _locations = _extractLocations(fetchedSchedules);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nöbet çizelgesi yüklenemedi: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> _extractList(dynamic data, String key) {
    if (data is Map) {
      if (data['data'] is Map && data['data'][key] is List) {
        return (data['data'][key] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (data[key] is List) {
        return (data[key] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      } else if (data['data'] is List) {
        return (data['data'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    }
    return [];
  }

  List<Teacher> _normalizeTeachers(dynamic data) {
    List<dynamic> raw = [];
    if (data is Map) {
      if (data['data'] is Map && data['data']['data'] is List) {
        raw = data['data']['data'] as List;
      } else if (data['data'] is List) {
        raw = data['data'] as List;
      } else if (data['data']?['users'] is List) {
        raw = data['data']['users'] as List;
      }
    }
    return raw
        .whereType<Map>()
        .map((e) => Teacher.fromJson(Map<String, dynamic>.from(e)))
        .toList()
      ..sort((a, b) => a.fullName.compareTo(b.fullName));
  }

  List<String> _extractLocations(List<DutySchedule> schedules) {
    return schedules
        .map((s) => s.location?.trim() ?? '')
        .where((l) => l.isNotEmpty)
        .toSet()
        .toList()
      ..sort((a, b) => a.compareTo(b));
  }

  String _getDayOfWeek(int dayOfWeek) {
    switch (dayOfWeek) {
      case 1:
        return 'Pazartesi';
      case 2:
        return 'Salı';
      case 3:
        return 'Çarşamba';
      case 4:
        return 'Perşembe';
      case 5:
        return 'Cuma';
      default:
        return 'Gün $dayOfWeek';
    }
  }

  String _getTeacherName(DutySchedule schedule) {
    if (schedule.user != null) {
      return schedule.user!.fullName.toUpperCase();
    }
    try {
      final teacher = _teachers.firstWhere((t) => t.id == schedule.userId);
      return teacher.fullName.toUpperCase();
    } catch (_) {
      return 'ÖĞRETMEN';
    }
  }

  // ========== CRUD ==========

  Future<void> _saveSchedule(
    int? editingId, {
    required int userId,
    required int dayOfWeek,
    required String startTime,
    required String endTime,
    required String location,
    required bool isActive,
  }) async {
    try {
      final api = ref.read(apiClientProvider);
      final payload = {
        'user_id': userId,
        'day_of_week': dayOfWeek,
        'start_time': startTime,
        'end_time': endTime,
        'location': location.isNotEmpty ? location : null,
        'is_active': isActive,
        'campus_id': _selectedCampusId,
        'education_level_id': _selectedEducationLevelId,
      };

      if (editingId != null) {
        await api.putJson('/duty-schedules/$editingId', data: payload);
      } else {
        await api.postJson('/duty-schedules', data: payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              editingId != null
                  ? 'Nöbet görevi güncellendi'
                  : 'Nöbet görevi oluşturuldu',
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
      await _bootstrap();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('İşlem başarısız: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteSchedule(DutySchedule schedule) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nöbet Görevini Sil'),
        content: const Text(
          'Bu nöbet görevini silmek istediğinize emin misiniz?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.postJson(
        '/duty-schedules/${schedule.id}',
        data: {'_method': 'DELETE'},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nöbet görevi silindi'),
            backgroundColor: Colors.green,
          ),
        );
      }
      await _bootstrap();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Silme işlemi başarısız: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() => _loading = false);
    }
  }

  Future<void> _deleteSchedulesByLocation(String location) async {
    final toDelete = _schedules.where((s) {
      final locOk = (s.location ?? '').trim() == location.trim();
      final campusOk =
          _selectedCampusId == null || s.campusId == _selectedCampusId;
      final levelOk =
          _selectedEducationLevelId == null ||
          s.educationLevelId == _selectedEducationLevelId;
      return locOk && campusOk && levelOk;
    }).toList();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nöbet Yerini Kaldır'),
        content: Text(
          toDelete.isEmpty
              ? "'$location' nöbet yerini kaldırmak istediğinize emin misiniz?"
              : "'$location' nöbet yerini ve bağlı ${toDelete.length} görevi kaldırmak istediğinize emin misiniz?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Kaldır'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      for (final schedule in toDelete) {
        await api.postJson(
          '/duty-schedules/${schedule.id}',
          data: {'_method': 'DELETE'},
        );
      }
      setState(() => _locations.remove(location));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nöbet yeri kaldırıldı'),
            backgroundColor: Colors.green,
          ),
        );
      }
      await _bootstrap();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('İşlem başarısız: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      setState(() => _loading = false);
    }
  }

  Future<void> _addLocation() async {
    if (_selectedEducationLevelId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lütfen önce eğitim kademesi seçiniz'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Yeni Nöbet Yeri'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Nöbet yeri adı'),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Ekle'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty && !_locations.contains(result)) {
      setState(() {
        _locations.add(result);
        _locations.sort();
      });
    }
  }

  // ========== Form Dialog ==========

  void _showFormDialog({
    DutySchedule? editing,
    int? initialDayOfWeek,
    String? initialLocation,
  }) {
    int? userId = editing?.userId;
    int dayOfWeek = initialDayOfWeek ?? editing?.dayOfWeek ?? 1;
    String startTime = editing != null
        ? editing.startTime.substring(0, 5)
        : '08:00';
    String endTime = editing != null
        ? editing.endTime.substring(0, 5)
        : '17:00';
    String location = initialLocation ?? editing?.location ?? '';
    bool isActive = editing?.isActive ?? true;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(
                editing != null
                    ? 'Nöbet Görevini Düzenle'
                    : 'Yeni Nöbet Görevi',
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<int?>(
                      initialValue: userId,
                      decoration: const InputDecoration(labelText: 'Öğretmen'),
                      items: [
                        const DropdownMenuItem(
                          value: null,
                          child: Text('Seçiniz'),
                        ),
                        ..._teachers.map(
                          (t) => DropdownMenuItem(
                            value: t.id,
                            child: Text(t.fullName),
                          ),
                        ),
                      ],
                      onChanged: (val) => setDialogState(() => userId = val),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      initialValue: dayOfWeek,
                      decoration: const InputDecoration(labelText: 'Gün'),
                      items: _days
                          .map(
                            (d) => DropdownMenuItem(
                              value: d['id'] as int,
                              child: Text(d['label']),
                            ),
                          )
                          .toList(),
                      onChanged: (val) =>
                          setDialogState(() => dayOfWeek = val ?? 1),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: startTime,
                            decoration: const InputDecoration(
                              labelText: 'Başlangıç',
                            ),
                            items: _timeOptions()
                                .map(
                                  (t) => DropdownMenuItem(
                                    value: t,
                                    child: Text(t),
                                  ),
                                )
                                .toList(),
                            onChanged: (val) => setDialogState(
                              () => startTime = val ?? '08:00',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: endTime,
                            decoration: const InputDecoration(
                              labelText: 'Bitiş',
                            ),
                            items: _timeOptions()
                                .map(
                                  (t) => DropdownMenuItem(
                                    value: t,
                                    child: Text(t),
                                  ),
                                )
                                .toList(),
                            onChanged: (val) =>
                                setDialogState(() => endTime = val ?? '17:00'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      initialValue: location,
                      decoration: const InputDecoration(
                        labelText: 'Nöbet Yeri',
                      ),
                      onChanged: (val) => location = val,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Checkbox(
                          value: isActive,
                          onChanged: (val) =>
                              setDialogState(() => isActive = val ?? true),
                        ),
                        const Text('Aktif'),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('İptal'),
                ),
                TextButton(
                  onPressed: () {
                    if (userId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Öğretmen seçmelisiniz'),
                          backgroundColor: Colors.orange,
                        ),
                      );
                      return;
                    }
                    Navigator.pop(context);
                    _saveSchedule(
                      editing?.id,
                      userId: userId!,
                      dayOfWeek: dayOfWeek,
                      startTime: startTime,
                      endTime: endTime,
                      location: location,
                      isActive: isActive,
                    );
                  },
                  child: const Text('Kaydet'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  List<String> _timeOptions() {
    final times = <String>[];
    for (int h = 6; h <= 22; h++) {
      for (int m = 0; m < 60; m += 15) {
        times.add(
          '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}',
        );
      }
    }
    return times;
  }

  // ========== Export (placeholder - share via native share) ==========



  // ========== Build ==========

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final sections = ref.watch(drawerSectionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nöbet Çizelgesi'),
        actions: [
          if (_canEdit)
            IconButton(
              icon: const Icon(Icons.add_location),
              onPressed: _addLocation,
              tooltip: 'Yeni Nöbet Yeri',
            ),

        ],
      ),
      drawer: AppDrawer(
        sections: sections,
        headerTitle: 'EduLem',
        headerSubtitle: profile.valueOrNull?['name']?.toString(),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _canEdit
          ? _buildAdminView()
          : _buildTeacherView(),
    );
  }

  // ========== Admin View (DataTable with filters + CRUD) ==========

  Widget _buildAdminView() {
    if (_schedules.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.schedule, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Bu haftada nöbet görevi yok',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _locations.length,
      itemBuilder: (context, idx) {
        final location = _locations[idx];

        final locationSchedules =
            _schedules.where((s) => s.location == location).toList()
              ..sort((a, b) {
                final dayCmp = a.dayOfWeek.compareTo(b.dayOfWeek);
                if (dayCmp != 0) return dayCmp;
                return a.startTime.compareTo(b.startTime);
              });

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade300, width: 1),
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(4),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Location header
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(14),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        location,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (_canEdit)
                      IconButton(
                        icon: const Icon(
                          Icons.delete,
                          size: 18,
                          color: Colors.red,
                        ),
                        onPressed: () => _deleteSchedulesByLocation(location),
                        tooltip: 'Kaldır',
                      ),
                  ],
                ),
              ),
              // Duty list
              Padding(
                padding: const EdgeInsets.all(14),
                child: locationSchedules.isEmpty
                    ? const Text(
                        'Bu lokasyonda nöbet görevi yok.',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    : Column(
                        children: locationSchedules.map((s) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: s.isActive
                                  ? Colors.green.shade50
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: s.isActive
                                    ? Colors.green.shade200
                                    : Colors.grey.shade300,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withAlpha(10),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.location_on,
                                    color: Colors.blue,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _getDayOfWeek(s.dayOfWeek),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _getTeacherName(s),
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: s.isActive
                                              ? Colors.green.shade800
                                              : Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (_canEdit)
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit, size: 16),
                                        onPressed: () =>
                                            _showFormDialog(editing: s),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(
                                          minWidth: 24,
                                          minHeight: 24,
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(
                                          Icons.delete,
                                          size: 16,
                                          color: Colors.red,
                                        ),
                                        onPressed: () => _deleteSchedule(s),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(
                                          minWidth: 24,
                                          minHeight: 24,
                                        ),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ========== Teacher View (Weekly cards, no filters, read-only) ==========

  Widget _buildTeacherView() {
    if (_schedules.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.schedule, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Bu hafta için nöbet görevi bulunamadı',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _days.length,
      itemBuilder: (context, idx) {
        final day = _days[idx];
        final dayId = day['id'] as int;
        final dayLabel = day['label'] as String;
        final daySchedules =
            _schedules.where((s) => s.dayOfWeek == dayId).toList()
              ..sort((a, b) {
                final locCmp = (a.location ?? '').compareTo(b.location ?? '');
                if (locCmp != 0) return locCmp;
                return a.startTime.compareTo(b.startTime);
              });

        final isToday = DateTime.now().weekday == dayId;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isToday ? Colors.blue : Colors.grey.shade300,
              width: isToday ? 2 : 1,
            ),
            color: Colors.white,
            boxShadow: isToday
                ? [
                    BoxShadow(
                      color: Colors.blue.withValues(alpha: 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Day header
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: isToday
                      ? Colors.blue.shade900
                      : const Color(0xFF1E293B),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(14),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        dayLabel,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    if (isToday)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Bugün',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              // Duty list
              Padding(
                padding: const EdgeInsets.all(14),
                child: daySchedules.isEmpty
                    ? const Text(
                        'Bu gün için nöbet görevi yok.',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      )
                    : Column(
                        children: daySchedules.map((s) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: s.isActive
                                  ? Colors.green.shade50
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: s.isActive
                                    ? Colors.green.shade200
                                    : Colors.grey.shade300,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.location_on,
                                    color: Colors.blue,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s.location ?? 'Nöbet Yeri',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${s.startTime.substring(0, 5)} - ${s.endTime.substring(0, 5)}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _getTeacherName(s),
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: s.isActive
                                              ? Colors.green.shade800
                                              : Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
