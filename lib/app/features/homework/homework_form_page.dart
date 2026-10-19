import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import 'homework_providers.dart';

// Rol sabitleri
const teacherRoles = [
  'Öğretmen',
  'Sınıf Öğretmeni',
  'Rehberlik',
  'teacher',
  'guidance',
];

class HomeworkFormPage extends ConsumerStatefulWidget {
  const HomeworkFormPage({super.key, this.homeworkId});

  final int? homeworkId;

  @override
  ConsumerState<HomeworkFormPage> createState() => _HomeworkFormPageState();
}

class _HomeworkFormPageState extends ConsumerState<HomeworkFormPage> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  int? _lessonId;
  // Çoklu sınıf seçimi: Set of selected classroom IDs
  final Set<int> _selectedClassroomIds = {};
  DateTime? _dueDate;
  bool _isActive = true;
  String _assignmentMode = 'all_class';
  final List<int> _selectedStudentIds = [];

  bool _loadingOptions = true;
  bool _loadingHomework = false;
  bool _isSaving = false;
  bool _checkingExisting = false;
  bool _showExistingWarning = false;

  List<Map<String, dynamic>> _lessons = const [];
  List<Map<String, dynamic>> _allClassrooms = const [];
  Map<int, List<int>> _lessonClassroomsMap = const {};
  List<Map<String, dynamic>> _students = const [];
  List<Map<String, dynamic>> _existingHomework = const [];

  List<Map<String, dynamic>> get _availableClassrooms {
    if (_lessonId == null) return const [];
    if (_lessonClassroomsMap.isNotEmpty) {
      final allowedIds = _lessonClassroomsMap[_lessonId] ?? [];
      return _allClassrooms.where((c) {
        final id = int.tryParse('${c['id']}');
        return id != null && allowedIds.contains(id);
      }).toList();
    }
    return _allClassrooms;
  }

  @override
  void initState() {
    super.initState();
    _loadOptions().then((_) {
      // Edit mode: load existing homework data
      if (widget.homeworkId != null) {
        _loadHomeworkData(widget.homeworkId!);
      }
    });
  }

  Future<void> _loadHomeworkData(int homeworkId) async {
    setState(() => _loadingHomework = true);
    try {
      final repo = ref.read(homeworkRepositoryProvider);
      final data = await repo.getById(homeworkId);

      setState(() {
        _titleController.text = (data['title'] ?? '').toString();
        _descriptionController.text = (data['description'] ?? '').toString();

        final lesson = data['lesson'];
        if (lesson is Map && lesson['id'] != null) {
          _lessonId = int.tryParse('${lesson['id']}');
        }

        // Eski tekil sınıf verisini çoklu yapıya çevir
        final classroom = data['classroom'];
        if (classroom is Map && classroom['id'] != null) {
          final id = int.tryParse('${classroom['id']}');
          if (id != null) _selectedClassroomIds.add(id);
        }
        // Eğer backend çoklu classroom_ids döndürüyorsa
        final classroomIds = data['classroom_ids'];
        if (classroomIds is List) {
          for (final cid in classroomIds) {
            final id = int.tryParse('$cid');
            if (id != null) _selectedClassroomIds.add(id);
          }
        }

        final dueDateStr = data['due_date']?.toString();
        if (dueDateStr != null && dueDateStr.isNotEmpty) {
          _dueDate = DateTime.tryParse(dueDateStr);
        }

        _isActive = data['is_active'] == true;
        _assignmentMode =
            data['assignment_mode']?.toString() ?? 'all_class';
      });

      // Seçili sınıflardan öğrencileri yükle
      if (_selectedClassroomIds.isNotEmpty) {
        await _loadStudents();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Ödev yüklenemedi: $e')));
      }
    } finally {
      if (mounted) setState(() => _loadingHomework = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    setState(() => _loadingOptions = true);
    try {
      final repo = ref.read(homeworkRepositoryProvider);
      final data = await repo.createOptions();

      final lessons =
          (data['lessons'] ??
          (data['data'] is Map ? data['data']['lessons'] : null));
      final classrooms =
          (data['classrooms'] ??
          (data['data'] is Map ? data['data']['classrooms'] : null));
      final lessonClassroomsRaw =
          (data['lesson_classrooms'] ??
          (data['data'] is Map ? data['data']['lesson_classrooms'] : null));

      final Map<int, List<int>> parsedMap = {};
      if (lessonClassroomsRaw is Map) {
        lessonClassroomsRaw.forEach((k, v) {
          final kid = int.tryParse('$k');
          if (kid != null && v is List) {
            parsedMap[kid] = v
                .map((e) => int.tryParse('$e'))
                .whereType<int>()
                .toList();
          }
        });
      }

      setState(() {
        _lessons = (lessons is List)
            ? lessons
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
            : const [];
        _allClassrooms = (classrooms is List)
            ? classrooms
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
            : const [];
        _lessonClassroomsMap = parsedMap;

        _lessonId ??= _lessons.isNotEmpty
            ? int.tryParse('${_lessons.first['id']}')
            : null;

        // İlk açılışta sınıf otomatik seçme — kullanıcı kendisi seçsin
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Create options hatası: $e')));
      }
    } finally {
      if (mounted) setState(() => _loadingOptions = false);
    }
  }

  /// Seçili tüm sınıfların öğrencilerini yükler
  Future<void> _loadStudents() async {
    if (_selectedClassroomIds.isEmpty) {
      setState(() => _students = []);
      return;
    }

    try {
      final repo = ref.read(homeworkRepositoryProvider);
      final allStudents = <Map<String, dynamic>>[];
      final seenIds = <int>{};

      for (final cid in _selectedClassroomIds) {
        final classroomName = _allClassrooms.firstWhere(
          (c) => (c['id'] == cid || '${c['id']}' == '$cid'),
          orElse: () => {'name': 'Sınıf $cid'},
        )['name'] ?? 'Sınıf $cid';

        final students = await repo.classroomStudents(cid);
        for (final s in students) {
          final id = int.tryParse('${s['id']}') ?? -1;
          if (!seenIds.contains(id)) {
            seenIds.add(id);
            final copy = Map<String, dynamic>.from(s);
            copy['classroom_id'] = cid;
            copy['classroom_name'] = classroomName;
            allStudents.add(copy);
          }
        }
      }

      if (mounted) {
        setState(() {
          _students = allStudents;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Öğrenciler yüklenemedi: $e')));
      }
    }
  }

  Future<void> _checkExistingHomework() async {
    if (_dueDate == null ||
        _selectedClassroomIds.isEmpty ||
        _lessonId == null) {
      return;
    }

    setState(() => _checkingExisting = true);
    try {
      await Future.delayed(const Duration(milliseconds: 500));

      if (mounted) {
        setState(() {
          _existingHomework = [];
          _showExistingWarning = _existingHomework.isNotEmpty;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _checkingExisting = false);
      }
    }
  }

  Future<void> _pickDueDate() async {
    final now = DateTime.now();
    final first = DateTime(2020);
    final last = DateTime(now.year + 5);

    DateTime initial = _dueDate ?? now;
    if (initial.isBefore(first)) initial = first;
    if (initial.isAfter(last)) initial = last;

    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: first,
      lastDate: last,
      locale: const Locale('tr', 'TR'),
    );

    if (date == null) return;
    setState(() => _dueDate = date);
    _checkExistingHomework();
  }

  Future<void> _save() async {
    if (_isSaving) return;

    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) return;

    if (_lessonId == null ||
        _selectedClassroomIds.isEmpty ||
        _dueDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ders, en az bir sınıf ve teslim tarihi zorunlu.'),
        ),
      );
      return;
    }

    // Öğretmen rol kontrolü
    final sessionAsync = ref.read(authSessionProvider);
    final userRole = sessionAsync.valueOrNull?.role;
    bool isTeacher =
        userRole != null &&
        teacherRoles.any((r) => r.toLowerCase() == userRole.toLowerCase());

    if (!isTeacher) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sadece öğretmenler ödev verebilir.')),
      );
      return;
    }

    if (_assignmentMode == 'selected_students' && _selectedStudentIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lütfen en az bir öğrenci seçiniz.')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final repo = ref.read(homeworkRepositoryProvider);
      final dueDateStr = _dueDate!.toIso8601String().substring(0, 10);
      final classroomIdsList = _selectedClassroomIds.toList();

      int savedCount = 0;

      // Her seçili sınıf için ödev oluştur / güncelle
      for (final cid in classroomIdsList) {
        List<int>? studentIdsForThisClass;
        if (_assignmentMode == 'selected_students') {
          studentIdsForThisClass = _students
              .where((s) => s['classroom_id'] == cid && _selectedStudentIds.contains(s['id']))
              .map((s) => int.parse('${s['id']}'))
              .toList();

          // Eğer bu sınıftan hiç öğrenci seçilmediyse bu sınıfı atla
          if (studentIdsForThisClass.isEmpty) {
            continue;
          }
        }

        if (widget.homeworkId != null && classroomIdsList.length == 1) {
          // Düzenleme modunda tek sınıf varsa normal update
          await repo.update(
            homeworkId: widget.homeworkId!,
            lessonId: _lessonId!,
            classroomId: cid,
            title: _titleController.text.trim(),
            description: _descriptionController.text.trim().isEmpty
                ? null
                : _descriptionController.text.trim(),
            dueDate: dueDateStr,
            assignmentMode: _assignmentMode,
            assignedStudentIds: studentIdsForThisClass,
            isActive: _isActive,
          );
          savedCount++;
        } else {
          // Yeni ödev — her sınıf için ayrı oluştur
          await repo.create(
            lessonId: _lessonId!,
            classroomId: cid,
            title: _titleController.text.trim(),
            description: _descriptionController.text.trim().isEmpty
                ? null
                : _descriptionController.text.trim(),
            dueDate: dueDateStr,
            assignmentMode: _assignmentMode,
            assignedStudentIds: studentIdsForThisClass,
            isActive: _isActive,
          );
          savedCount++;
        }
      }

      if (mounted) {
        final msg = widget.homeworkId != null
            ? 'Ödev başarıyla güncellendi.'
            : savedCount > 1
                ? '$savedCount sınıfa ödev başarıyla oluşturuldu.'
                : 'Ödev başarıyla oluşturuldu.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.homeworkId != null
                  ? 'Ödev güncelleme hatası: $e'
                  : 'Ödev oluşturma hatası: $e',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.homeworkId != null ? 'Ödev Düzenle' : 'Yeni Ödev'),
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
      body: _loadingOptions || _loadingHomework
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
                    // Ödev Bilgileri Kartı
                    Card(
                      elevation: 2,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Ödev Bilgileri',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Ders seçimi
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
                                setState(() {
                                  _lessonId = v;
                                  if (_lessonClassroomsMap.isNotEmpty && v != null) {
                                    final allowed = _lessonClassroomsMap[v] ?? [];
                                    _selectedClassroomIds.removeWhere(
                                      (cid) => !allowed.contains(cid),
                                    );
                                  }
                                });
                                _loadStudents();
                                _checkExistingHomework();
                              },
                              decoration: const InputDecoration(
                                labelText: 'Ders *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  (v == null || v <= 0) ? 'Ders gerekli' : null,
                            ),
                            const SizedBox(height: 16),

                            // Çoklu Sınıf Seçimi
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text(
                                      'Sınıf Seçimi *',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    if (_selectedClassroomIds.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Theme.of(context).primaryColor,
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          '${_selectedClassroomIds.length} sınıf seçili',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    const Spacer(),
                                    if (_availableClassrooms.isNotEmpty) ...[
                                      TextButton(
                                        onPressed: () {
                                          setState(() {
                                            for (final c in _availableClassrooms) {
                                              final id = int.tryParse('${c['id']}');
                                              if (id != null) {
                                                _selectedClassroomIds.add(id);
                                              }
                                            }
                                            _selectedStudentIds.clear();
                                          });
                                          _loadStudents();
                                          _checkExistingHomework();
                                        },
                                        style: TextButton.styleFrom(
                                          visualDensity: VisualDensity.compact,
                                          padding: const EdgeInsets.symmetric(horizontal: 6),
                                        ),
                                        child: const Text('Tümünü Seç', style: TextStyle(fontSize: 12)),
                                      ),
                                      TextButton(
                                        onPressed: () {
                                          setState(() {
                                            _selectedClassroomIds.clear();
                                            _selectedStudentIds.clear();
                                            _students = [];
                                          });
                                        },
                                        style: TextButton.styleFrom(
                                          visualDensity: VisualDensity.compact,
                                          padding: const EdgeInsets.symmetric(horizontal: 6),
                                        ),
                                        child: const Text('Temizle', style: TextStyle(fontSize: 12)),
                                      ),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Birden fazla sınıf seçebilirsiniz.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: _selectedClassroomIds.isEmpty
                                          ? Colors.red.shade300
                                          : Colors.grey.shade400,
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: _availableClassrooms.isEmpty
                                      ? Padding(
                                          padding: const EdgeInsets.all(16),
                                          child: Center(
                                            child: Text(
                                              _lessonId == null
                                                  ? 'Lütfen önce ders seçiniz.'
                                                  : 'Bu derse atanmış sınıf bulunamadı.',
                                              style: const TextStyle(
                                                fontSize: 13,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ),
                                        )
                                      : Column(
                                          children: _availableClassrooms.map((c) {
                                            final id =
                                                int.tryParse('${c['id']}') ?? -1;
                                            final name = (c['name'] ?? '').toString();
                                            final isSelected =
                                                _selectedClassroomIds.contains(id);

                                            return CheckboxListTile(
                                              dense: true,
                                              title: Text(name),
                                              value: isSelected,
                                              activeColor:
                                                  Theme.of(context).primaryColor,
                                              onChanged: (checked) {
                                                setState(() {
                                                  if (checked == true) {
                                                    _selectedClassroomIds.add(id);
                                                  } else {
                                                    _selectedClassroomIds.remove(id);
                                                  }
                                                  // Seçim değişince öğrenci listesini yeniden yükle
                                                  _selectedStudentIds.clear();
                                                });
                                                _loadStudents();
                                                _checkExistingHomework();
                                              },
                                            );
                                          }).toList(),
                                        ),
                                ),
                                if (_selectedClassroomIds.isEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4, left: 12),
                                    child: Text(
                                      'En az bir sınıf seçiniz',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.red.shade700,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            // Ödev Başlığı
                            TextFormField(
                              controller: _titleController,
                              decoration: const InputDecoration(
                                labelText: 'Ödev Başlığı *',
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

                            // Açıklama
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

                            // Teslim Tarihi
                            InkWell(
                              onTap: _pickDueDate,
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
                                            'Teslim Tarihi *',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey,
                                            ),
                                          ),
                                          Text(
                                            _dueDate == null
                                                ? 'Tarih seçin'
                                                : _formatDate(_dueDate!),
                                            style: const TextStyle(fontSize: 16),
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

                            // Atama Modu
                            const Text(
                              'Atama Modu',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ListTile(
                              title: const Text('Tüm sınıfa'),
                              leading: CircleAvatar(
                                radius: 12,
                                backgroundColor: _assignmentMode == 'all_class'
                                    ? Theme.of(context).primaryColor
                                    : Colors.grey.shade300,
                                child: _assignmentMode == 'all_class'
                                    ? const Icon(
                                        Icons.check,
                                        size: 16,
                                        color: Colors.white,
                                      )
                                    : null,
                              ),
                              onTap: () =>
                                  setState(() => _assignmentMode = 'all_class'),
                            ),
                            ListTile(
                              title: const Text('Seçili öğrenciler'),
                              leading: CircleAvatar(
                                radius: 12,
                                backgroundColor:
                                    _assignmentMode == 'selected_students'
                                    ? Theme.of(context).primaryColor
                                    : Colors.grey.shade300,
                                child: _assignmentMode == 'selected_students'
                                    ? const Icon(
                                        Icons.check,
                                        size: 16,
                                        color: Colors.white,
                                      )
                                    : null,
                              ),
                              onTap: () => setState(
                                () => _assignmentMode = 'selected_students',
                              ),
                            ),

                            // Öğrenci seçimi
                            if (_assignmentMode == 'selected_students') ...[
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  const Text(
                                    'Öğrenci Seçimi',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (_selectedStudentIds.isNotEmpty)
                                    Text(
                                      '(${_selectedStudentIds.length} öğrenci seçildi)',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Theme.of(context).primaryColor,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              if (_students.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Text(
                                    'Önce sınıf seçiniz.',
                                    style: TextStyle(color: Colors.grey),
                                  ),
                                )
                              else
                                ..._buildGroupedStudentList(),
                            ],
                            const SizedBox(height: 16),

                            // Mevcut ödev kontrolü
                            if (_checkingExisting)
                              const Row(
                                children: [
                                  SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Bu tarihteki mevcut ödevler kontrol ediliyor...',
                                  ),
                                ],
                              ),
                            if (_showExistingWarning &&
                                _existingHomework.isNotEmpty) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.orange.shade50,
                                  border: Border.all(
                                    color: Colors.orange.shade200,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.warning,
                                          color: Colors.orange.shade700,
                                          size: 20,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Bu Tarihte Mevcut Ödevler (${_existingHomework.length})',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            color: Colors.orange.shade700,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    ..._existingHomework.map((hw) {
                                      final title =
                                          (hw['title'] ?? '').toString();
                                      final lessonName =
                                          (hw['lesson_name'] ?? '').toString();

                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
                                        child: Row(
                                          children: [
                                            Text(
                                              '· $title',
                                              style: const TextStyle(
                                                fontSize: 14,
                                              ),
                                            ),
                                            if (lessonName.isNotEmpty) ...[
                                              const SizedBox(width: 4),
                                              Text(
                                                '($lessonName)',
                                                style: const TextStyle(
                                                  color: Colors.grey,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),

                            // Yayımla
                            SwitchListTile(
                              value: _isActive,
                              onChanged: (v) => setState(() => _isActive = v),
                              title: const Text('Ödevi yayımla'),
                              subtitle: const Text(
                                'Kapalı ise ödev sadece siz görünür',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Kaydet / İptal Butonları
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
                                : const Text('Ödevi Kaydet'),
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

  List<Widget> _buildGroupedStudentList() {
    final Map<int, List<Map<String, dynamic>>> byClassroom = {};
    for (final s in _students) {
      final cid = s['classroom_id'] as int? ?? 0;
      byClassroom.putIfAbsent(cid, () => []).add(s);
    }

    final widgets = <Widget>[];

    byClassroom.forEach((cid, classStudents) {
      final classroomName =
          classStudents.first['classroom_name']?.toString() ?? 'Sınıf $cid';
      final selectedInClass = classStudents
          .where((s) => _selectedStudentIds.contains(s['id']))
          .length;
      final allSelectedInClass =
          selectedInClass == classStudents.length && classStudents.isNotEmpty;

      widgets.add(
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(7)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        classroomName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Text(
                      '$selectedInClass / ${classStudents.length}',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    ),
                    const SizedBox(width: 12),
                    InkWell(
                      onTap: () {
                        setState(() {
                          if (allSelectedInClass) {
                            for (final s in classStudents) {
                              _selectedStudentIds.remove(s['id']);
                            }
                          } else {
                            for (final s in classStudents) {
                              final id = int.tryParse('${s['id']}');
                              if (id != null &&
                                  !_selectedStudentIds.contains(id)) {
                                _selectedStudentIds.add(id);
                              }
                            }
                          }
                        });
                      },
                      child: Text(
                        allSelectedInClass ? 'Bırak' : 'Tümünü Seç',
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              ...classStudents.map((student) {
                final id = int.tryParse('${student['id']}') ?? -1;
                final name = (student['name'] ?? '').toString();
                final schoolNo = (student['school_no'] ?? '').toString();

                return CheckboxListTile(
                  dense: true,
                  title: Text(name),
                  subtitle: schoolNo.isNotEmpty ? Text('No: $schoolNo') : null,
                  value: _selectedStudentIds.contains(id),
                  activeColor: Theme.of(context).primaryColor,
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
          ),
        ),
      );
    });

    return widgets;
  }

  String _formatDate(DateTime date) {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const days = [
      'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}, ${days[date.weekday - 1]}';
  }
}
