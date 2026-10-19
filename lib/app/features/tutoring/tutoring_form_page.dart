import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../lessons/lessons_providers.dart';
import '../classrooms/classrooms_providers.dart';
import '../students/students_providers.dart';

import '../users/users_providers.dart';
import 'tutoring_providers.dart';

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

class TutoringFormPage extends ConsumerStatefulWidget {
  final int? tutoringId;
  const TutoringFormPage({super.key, this.tutoringId});

  @override
  ConsumerState<TutoringFormPage> createState() => _TutoringFormPageState();
}

class _TutoringFormPageState extends ConsumerState<TutoringFormPage> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _maxStudentsController = TextEditingController();

  int? _lessonId;
  int? _classroomId;
  int? _teacherId;
  DateTime? _date;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  String _tutoringType = 'etut';
  final List<int> _selectedStudentIds = [];
  bool _isActive = true;

  bool _loadingOptions = true;
  bool _isSaving = false;

  List<Map<String, dynamic>> _lessons = const [];
  List<Map<String, dynamic>> _classrooms = const [];
  List<Map<String, dynamic>> _students = const [];
  List<Map<String, dynamic>> _teachers = const [];

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _maxStudentsController.dispose();
    super.dispose();
  }

  Future<void> _loadTutoringData() async {
    if (widget.tutoringId == null) return;

    try {
      final repo = ref.read(tutoringRepositoryProvider);
      final data = await repo.getById(widget.tutoringId!);
      
      setState(() {
        _titleController.text = data['title']?.toString() ?? '';
        _descriptionController.text = data['description']?.toString() ?? '';
        _lessonId = int.tryParse(data['lesson_id']?.toString() ?? '') ??
            (data['lesson'] is Map
                ? int.tryParse(data['lesson']['id']?.toString() ?? '')
                : null);
        _classroomId = int.tryParse(data['classroom_id']?.toString() ?? '') ??
            (data['classroom'] is Map
                ? int.tryParse(data['classroom']['id']?.toString() ?? '')
                : null);
        _tutoringType = data['tutoring_type']?.toString() ?? 'etut';
        _isActive = data['is_active'] == true;

        _teacherId = int.tryParse(data['teacher_id']?.toString() ?? '') ??
            (data['teacher'] is Map
                ? int.tryParse(data['teacher']['id']?.toString() ?? '')
                : null);
        if (data['max_students'] != null) {
          _maxStudentsController.text = data['max_students'].toString();
        }
        
        if (data['date'] != null) {
          _date = DateTime.tryParse(data['date'].toString());
        }
        
        if (data['start_time'] != null) {
          final parts = data['start_time'].toString().split(':');
          if (parts.length >= 2) {
            _startTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
          }
        }
        
        if (data['end_time'] != null) {
          final parts = data['end_time'].toString().split(':');
          if (parts.length >= 2) {
            _endTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
          }
        }

        if (data['students'] is List) {
          _selectedStudentIds.clear();
          for (var s in (data['students'] as List)) {
            final sid = int.tryParse(s['id']?.toString() ?? '');
            if (sid != null) _selectedStudentIds.add(sid);
          }
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Veri yüklenemedi: $e')));
      }
    }
  }

  Future<void> _loadOptions() async {
    setState(() => _loadingOptions = true);
    try {
      final lessonsRepo = ref.read(lessonsRepositoryProvider);
      final classroomsRepo = ref.read(classroomsRepositoryProvider);
      
      final lessonsData = await lessonsRepo.list();
      final classroomsData = await classroomsRepo.list(perPage: 500);
      
      // Sınıfları tekilleştir
      final seenClassIds = <int>{};
      final uniqueClassrooms = <Map<String, dynamic>>[];
      for (var c in classroomsData) {
        final id = int.tryParse(c['id']?.toString() ?? '');
        if (id != null && !seenClassIds.contains(id)) {
          seenClassIds.add(id);
          uniqueClassrooms.add(c);
        }
      }
      
      // Öğretmenleri users repository üzerinden çek (Filtresiz çekip lokal ayıklama yapalım ki garanti olsun)
      try {
        final usersRepo = ref.read(usersRepositoryProvider);
        final teachersResult = await usersRepo.list(perPage: 500);
        
        final List<dynamic> allUsers = teachersResult['users'] ?? teachersResult['data'] ?? teachersResult['items'] ?? [];
        
        // Rolü öğretmen, teacher, rehberlik veya guidance olanları ayıkla
        final teacherSlugs = ['teacher', 'guidance', 'öğretmen', 'rehberlik', 'sınıf öğretmeni'];
        
        _teachers = allUsers.where((u) {
          final role = u['role']?.toString().toLowerCase() ?? '';
          final roleSlug = u['role_slug']?.toString().toLowerCase() ?? '';
          return teacherSlugs.any((slug) => role.contains(slug) || roleSlug.contains(slug));
        }).map((e) => {
          'id': e['id'],
          'name': e['name'],
        }).toList();
        
        if (_teachers.isEmpty && allUsers.isNotEmpty) {
           // Eğer hala boşsa ama kullanıcı geldiyse, en azından tümünü gösterelim (debug için)
           _teachers = allUsers.map((e) => {'id': e['id'], 'name': e['name']}).toList();
        }
      } catch (e) {
        debugPrint('Öğretmenler yüklenirken hata: $e');
        _teachers = [];
      }

      setState(() {
        _lessons = lessonsData;
        _classrooms = uniqueClassrooms;

        _lessonId ??= _lessons.isNotEmpty
            ? int.tryParse('${_lessons.first['id']}')
            : null;
        _classroomId ??= _classrooms.isNotEmpty
            ? int.tryParse('${_classrooms.first['id']}')
            : null;
      });

      if (_classroomId != null) {
        await _loadStudents();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Seçenekler yüklenemedi: $e')));
      }
    } finally {
      if (widget.tutoringId != null) {
        await _loadTutoringData();
      }
      if (mounted) setState(() => _loadingOptions = false);
    }
  }

  Future<void> _loadStudents() async {
    if (_classroomId == null) return;

    try {
      // Öğrencileri students repository ile sınıf filtresiyle çek
      final studentsRepo = ref.read(studentsRepositoryProvider);
      final result = await studentsRepo.list(
        page: 1,
        perPage: 200,
        classroomId: _classroomId,
      );

      final students = result['items'] as List<Map<String, dynamic>>;

      setState(() {
        _students = students;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Öğrenciler yüklenemedi: $e')));
      }
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final first = DateTime(now.year - 2);
    final last = DateTime(now.year + 5);
    
    DateTime initial = _date ?? now;
    if (initial.isBefore(first)) initial = first;
    if (initial.isAfter(last)) initial = last;

    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: first,
      lastDate: last,
    );

    if (date == null) return;
    setState(() => _date = date);
  }

  Future<void> _pickStartTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _startTime ?? TimeOfDay.now(),
    );

    if (time == null) return;
    setState(() => _startTime = time);
  }

  Future<void> _pickEndTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _endTime ?? TimeOfDay.now(),
    );

    if (time == null) return;
    setState(() => _endTime = time);
  }

  Future<void> _save() async {
    if (_isSaving) return;

    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) return;

    if (_lessonId == null || _classroomId == null || _date == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ders, sınıf ve tarih zorunlu.')),
      );
      return;
    }

    // Rol kontrolü (Öğretmen veya Yönetici)
    final sessionAsync = ref.read(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    bool isTeacher =
        userRole != null &&
        teacherRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());
    bool isManagement =
        userRole != null &&
        managementRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    if (!isTeacher && !isManagement) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bu işlemi yapmaya yetkiniz bulunmuyor.'),
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final repo = ref.read(tutoringRepositoryProvider);
      final maxStudents = int.tryParse(_maxStudentsController.text);

      if (widget.tutoringId != null) {
        await repo.update(
          id: widget.tutoringId!,
          lessonId: _lessonId!,
          classroomId: _classroomId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
          date: _date!.toIso8601String().substring(0, 10),
          startTime: _startTime != null ? '${_startTime!.hour.toString().padLeft(2, '0')}:${_startTime!.minute.toString().padLeft(2, '0')}' : '09:00',
          endTime: _endTime != null ? '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}' : '10:00',
          teacherId: _teacherId,
          maxStudents: maxStudents,
          tutoringType: _tutoringType,
          studentIds: _selectedStudentIds.isNotEmpty ? _selectedStudentIds : null,
          isActive: _isActive,
        );
      } else {
        await repo.create(
          lessonId: _lessonId!,
          classroomId: _classroomId!,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
          date: _date!.toIso8601String().substring(0, 10),
          startTime: _startTime != null ? '${_startTime!.hour.toString().padLeft(2, '0')}:${_startTime!.minute.toString().padLeft(2, '0')}' : '09:00',
          endTime: _endTime != null ? '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}' : '10:00',
          teacherId: _teacherId,
          maxStudents: maxStudents,
          tutoringType: _tutoringType,
          studentIds: _selectedStudentIds.isNotEmpty ? _selectedStudentIds : null,
          isActive: _isActive,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Etüt/Özel Ders başarıyla oluşturuldu.'),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Oluşturma hatası: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  String _formatTime(TimeOfDay? time) {
    if (time == null) return 'Seçin';
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Tarih seçin';
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final userRole = ref.watch(authSessionProvider).valueOrNull?.role.toLowerCase() ?? '';
    final isManagement = managementRoles.any((r) => r.toLowerCase() == userRole);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.tutoringId != null ? 'Etüt Düzenle' : 'Yeni Etüt/Özel Ders'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Kaydet'),
          ),
        ],
      ),
      body: _loadingOptions
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    Card(
                      elevation: 2,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Bilgiler',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<int>(
                              initialValue: _lessonId,
                              items: _lessons
                                  .map(
                                    (l) => DropdownMenuItem(
                                      value: int.tryParse('${l['id']}'),
                                      child: Text((l['name'] ?? '').toString()),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) {
                                setState(() => _lessonId = v);
                              },
                              decoration: const InputDecoration(
                                labelText: 'Ders *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  (v == null || v <= 0) ? 'Ders gerekli' : null,
                            ),
                            const SizedBox(height: 16),
                            DropdownButtonFormField<int>(
                              initialValue: _classroomId,
                              items: _classrooms
                                  .map(
                                    (c) => DropdownMenuItem(
                                      value: int.tryParse('${c['id']}'),
                                      child: Text(
                                        '${c['name'] ?? ''} ${c['campus'] is Map ? '(${c['campus']['name']})' : ''}',
                                      ),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (v) {
                                setState(() => _classroomId = v);
                                _loadStudents();
                              },
                              decoration: const InputDecoration(
                                labelText: 'Sınıf *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => (v == null || v <= 0) ? 'Sınıf gerekli' : null,
                            ),
                            if (isManagement) ...[
                              const SizedBox(height: 16),
                              DropdownButtonFormField<int>(
                                initialValue: _teacherId,
                                items: _teachers
                                    .map(
                                      (t) => DropdownMenuItem(
                                        value: int.tryParse('${t['id']}'),
                                        child: Text((t['name'] ?? '').toString()),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (v) {
                                  setState(() => _teacherId = v);
                                },
                                decoration: const InputDecoration(
                                  labelText: 'Öğretmen (Opsiyonel)',
                                  border: OutlineInputBorder(),
                                  helperText: 'Boş bırakılırsa siz atanısınız',
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _maxStudentsController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Kontenjan (Maksimum Öğrenci)',
                                border: OutlineInputBorder(),
                                helperText: 'Sınırsız için boş bırakın',
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _titleController,
                              decoration: const InputDecoration(
                                labelText: 'Başlık *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  return 'Başlık gerekli';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _descriptionController,
                              decoration: const InputDecoration(
                                labelText: 'Açıklama',
                                border: OutlineInputBorder(),
                                alignLabelWithHint: true,
                              ),
                              maxLines: 4,
                            ),
                            const SizedBox(height: 16),
                            InkWell(
                              onTap: _pickDate,
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.calendar_today),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Tarih *',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey,
                                            ),
                                          ),
                                          Text(
                                            _formatDate(_date),
                                            style: const TextStyle(
                                              fontSize: 16,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(Icons.arrow_drop_down),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    onTap: _pickStartTime,
                                    child: Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.access_time),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Başlangıç',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.grey,
                                                  ),
                                                ),
                                                Text(
                                                  _formatTime(_startTime),
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: InkWell(
                                    onTap: _pickEndTime,
                                    child: Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.grey),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.access_time_filled),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Bitiş',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: Colors.grey,
                                                  ),
                                                ),
                                                Text(
                                                  _formatTime(_endTime),
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Tür',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ListTile(
                              title: const Text('Etüt'),
                              leading: CircleAvatar(
                                radius: 12,
                                backgroundColor: _tutoringType == 'etut'
                                    ? Theme.of(context).primaryColor
                                    : Colors.grey.shade300,
                                child: _tutoringType == 'etut'
                                    ? const Icon(
                                        Icons.check,
                                        size: 16,
                                        color: Colors.white,
                                      )
                                    : null,
                              ),
                              onTap: () =>
                                  setState(() => _tutoringType = 'etut'),
                            ),
                            ListTile(
                              title: const Text('Özel Ders'),
                              leading: CircleAvatar(
                                radius: 12,
                                backgroundColor: _tutoringType == 'private'
                                    ? Theme.of(context).primaryColor
                                    : Colors.grey.shade300,
                                child: _tutoringType == 'private'
                                    ? const Icon(
                                        Icons.check,
                                        size: 16,
                                        color: Colors.white,
                                      )
                                    : null,
                              ),
                              onTap: () =>
                                  setState(() => _tutoringType = 'private'),
                            ),
                            if (_students.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              const Text(
                                'Öğrenci Seçimi (Opsiyonel)',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Boş bırakırsanız tüm sınıfa atanır',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ..._students.map((student) {
                                final id =
                                    int.tryParse('${student['id']}') ?? -1;
                                final name = (student['name'] ?? '').toString();
                                final schoolNo = (student['school_no'] ?? '')
                                    .toString();

                                if (id <= 0) return const SizedBox.shrink();

                                return CheckboxListTile(
                                  title: Text(name),
                                  subtitle: schoolNo.isNotEmpty
                                      ? Text('No: $schoolNo')
                                      : null,
                                  value: _selectedStudentIds.contains(id),
                                  onChanged: (checked) {
                                    setState(() {
                                      if (checked == true) {
                                        _selectedStudentIds.add(id);
                                      } else {
                                        _selectedStudentIds.remove(id);
                                      }
                                    });
                                  },
                                );
                              }),
                            ],
                            const SizedBox(height: 16),
                            SwitchListTile(
                              value: _isActive,
                              onChanged: (v) => setState(() => _isActive = v),
                              title: const Text('Aktif'),
                              subtitle: const Text(
                                'Kapalı ise öğrenciler göremez',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _isSaving ? null : () => context.pop(),
                            child: const Text('İptal'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _save,
                            child: _isSaving
                                ? const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      ),
                                      SizedBox(width: 8),
                                      Text('Kaydediliyor...'),
                                    ],
                                  )
                                : const Text('Kaydet'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
