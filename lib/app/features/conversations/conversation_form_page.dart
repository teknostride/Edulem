import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../ui/molecules/voice_input_button.dart';
import '../classrooms/classrooms_providers.dart';
import 'conversations_providers.dart';
import 'counseling_providers.dart';

class ConversationFormPage extends ConsumerStatefulWidget {
  final int? meetingId;
  final Map<String, dynamic>? initialRecord;
  final String? initialType;
  const ConversationFormPage({
    super.key,
    this.meetingId,
    this.initialRecord,
    this.initialType,
  });

  @override
  ConsumerState<ConversationFormPage> createState() =>
      _ConversationFormPageState();
}

class _ConversationFormPageState extends ConsumerState<ConversationFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();

  int? _selectedClassroomId;
  int? _selectedStudentId;

  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();

  String _selectedType = 'meeting'; // meeting | appointment
  String _selectedMeetingWith = 'student'; // student | parent
  String _selectedVisibility =
      'admin_only'; // admin_only | teachers_open | public | private

  bool _loading = false;
  bool _saving = false;
  List<Map<String, dynamic>> _students = [];
  bool _loadingStudents = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialType != null) {
      if (widget.initialType == 'appointment') {
        _selectedType = 'appointment';
      } else if (widget.initialType == 'note') {
        _selectedType = 'meeting';
        _selectedVisibility = 'private';
      } else {
        _selectedType = widget.initialType!;
      }
    }
    if (widget.initialRecord != null) {
      _initFromRecord(widget.initialRecord!);
    } else if (widget.meetingId != null) {
      _loadMeetingData();
    }
  }

  void _initFromRecord(Map<String, dynamic> meeting) {
    _titleController.text = meeting['subject'] ?? meeting['title'] ?? '';
    _contentController.text = meeting['content'] ?? meeting['notes'] ?? '';
    _selectedType = meeting['type'] ?? _selectedType;
    _selectedMeetingWith = meeting['meeting_with'] ?? 'student';
    _selectedVisibility =
        (meeting['is_private'] == true || meeting['is_private'] == 1)
            ? 'private'
            : (meeting['visibility'] ?? 'admin_only');

    if (meeting['classroom_id'] != null) {
      _selectedClassroomId = int.tryParse(meeting['classroom_id'].toString());
    } else if (meeting['student'] != null &&
        meeting['student'] is Map &&
        meeting['student']['classroom_id'] != null) {
      _selectedClassroomId = int.tryParse(
        meeting['student']['classroom_id'].toString(),
      );
    }

    if (meeting['student_id'] != null) {
      _selectedStudentId = int.tryParse(meeting['student_id'].toString());
    } else if (meeting['student'] != null &&
        meeting['student'] is Map &&
        meeting['student']['id'] != null) {
      _selectedStudentId = int.tryParse(
        meeting['student']['id'].toString(),
      );
    }

    if (meeting['date'] != null && meeting['date'].toString().isNotEmpty) {
      _selectedDate =
          DateTime.tryParse(meeting['date'].toString()) ?? DateTime.now();
    } else if (meeting['meeting_date'] != null &&
        meeting['meeting_date'].toString().isNotEmpty) {
      _selectedDate =
          DateTime.tryParse(meeting['meeting_date'].toString()) ??
          DateTime.now();
    }

    final timeVal = meeting['time'] ?? meeting['meeting_time'];
    if (timeVal != null && timeVal.toString().isNotEmpty) {
      final parts = timeVal.toString().split(':');
      if (parts.length >= 2) {
        _selectedTime = TimeOfDay(
          hour: int.tryParse(parts[0]) ?? 0,
          minute: int.tryParse(parts[1]) ?? 0,
        );
      }
    }

    if (_selectedClassroomId != null) {
      _loadStudents(_selectedClassroomId!);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _loadMeetingData() async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      Map<String, dynamic> meeting = {};
      try {
        meeting = await repo.getMeetingById(widget.meetingId!);
      } catch (_) {
        try {
          meeting = await repo.getCounselingRecord(widget.meetingId!);
        } catch (_) {
          meeting = await repo.getSessionById(widget.meetingId!);
        }
      }

      setState(() {
        _initFromRecord(meeting);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Veri yüklenemedi: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadStudents(int classroomId) async {
    setState(() => _loadingStudents = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      final list = await repo.getClassroomStudents(classroomId);
      if (mounted) {
        setState(() => _students = list);
      }
    } catch (e) {
      debugPrint('Öğrenciler yüklenemedi: $e');
    } finally {
      if (mounted) {
        setState(() => _loadingStudents = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClassroomId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lütfen sınıf seçin')));
      return;
    }
    if (_selectedStudentId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lütfen öğrenci seçin')));
      return;
    }

    setState(() => _saving = true);
    try {
      final repo = ref.read(conversationsRepositoryProvider);
      final dateStr = _selectedDate.toIso8601String().substring(0, 10);
      final timeStr =
          '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}';
      final meetingAt = '$dateStr $timeStr:00';
      final isPrivate =
          _selectedVisibility == 'private' || _selectedVisibility == 'admin_only';

      final title = _titleController.text.trim().isNotEmpty
          ? _titleController.text.trim()
          : (_selectedType == 'appointment' ? 'Randevu' : 'Görüşme');

      final recordId = widget.meetingId ??
          (widget.initialRecord != null
              ? widget.initialRecord!['id'] as int?
              : null);

      if (recordId != null) {
        try {
          await repo.updateMeeting(recordId, {
            'student_id': _selectedStudentId,
            'classroom_id': _selectedClassroomId,
            'meeting_date': dateStr,
            'meeting_time': timeStr,
            'type': _selectedType,
            'meeting_with': _selectedMeetingWith,
            'title': title,
            'content': _contentController.text.trim(),
            'visibility': _selectedVisibility,
          });
        } catch (_) {
          await repo.updateCounselingRecord(
            recordId,
            studentId: _selectedStudentId!,
            subject: title,
            content: _contentController.text.trim(),
            meetingAt: meetingAt,
            isPrivate: isPrivate,
          );
        }
      } else {
        try {
          await repo.createMeeting(
            type: _selectedType,
            meetingWith: _selectedMeetingWith,
            classroomId: _selectedClassroomId!,
            studentId: _selectedStudentId!,
            title: title,
            content: _contentController.text.trim(),
            meetingDate: dateStr,
            meetingTime: timeStr,
            visibility: _selectedVisibility,
          );
        } catch (_) {
          await repo.createCounselingRecord(
            studentId: _selectedStudentId!,
            subject: title,
            content: _contentController.text.trim(),
            meetingAt: meetingAt,
            isPrivate: isPrivate,
          );
        }
      }

      if (mounted) {
        ref.invalidate(counselingRecordsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              recordId != null
                  ? 'Görüşme kaydı güncellendi'
                  : 'Görüşme kaydı başarıyla eklendi',
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final teacherClassroomsAsync = ref.watch(teacherClassroomsProvider);
    final fallbackClassroomsAsync = ref.watch(classroomsListProvider);
    final classrooms = (teacherClassroomsAsync.valueOrNull != null &&
            teacherClassroomsAsync.valueOrNull!.isNotEmpty)
        ? teacherClassroomsAsync.valueOrNull!
        : (fallbackClassroomsAsync.valueOrNull ?? []);
    final isLoadingClassrooms =
        teacherClassroomsAsync.isLoading && classrooms.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.meetingId != null || widget.initialRecord != null
              ? 'Görüşme Düzenle'
              : (_selectedType == 'appointment'
                  ? 'Yeni Randevu'
                  : 'Yeni Görüşme Tutanağı'),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Görüşme Bilgileri',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Sınıf Seçimi (Öğretmene atanan sınıflar doğrudan listelenir - Web ile birebir)
            _buildDropdown<int>(
              label: 'Sınıf Seçimi *',
              value: _selectedClassroomId,
              items: [
                DropdownMenuItem(
                  value: null,
                  child: Text(
                    isLoadingClassrooms
                        ? 'Sınıflar yükleniyor...'
                        : (classrooms.isEmpty
                            ? 'Atanmış sınıf bulunamadı'
                            : 'Sınıf Seçin'),
                  ),
                ),
                if (_selectedClassroomId != null &&
                    !classrooms.any((c) => c['id'] == _selectedClassroomId))
                  DropdownMenuItem(
                    value: _selectedClassroomId,
                    child: Text(
                      widget.initialRecord?['classroom_name']?.toString() ??
                          widget.initialRecord?['student']?['classroom']?['name']?.toString() ??
                          'Seçili Sınıf',
                    ),
                  ),
                ...classrooms.map((e) {
                  final edLevel = e['education_level']?.toString();
                  final name = e['name']?.toString() ?? '';
                  final label = (edLevel != null && edLevel.isNotEmpty)
                      ? '$edLevel - $name'
                      : name;
                  return DropdownMenuItem(
                    value: e['id'] as int,
                    child: Text(label),
                  );
                }),
              ],
              onChanged: (v) => setState(() {
                _selectedClassroomId = v;
                _selectedStudentId = null;
                if (v != null) _loadStudents(v);
              }),
              validator: (v) => v == null ? 'Sınıf gerekli' : null,
            ),
            const SizedBox(height: 12),

            // Öğrenci Seçimi
            _buildStudentDropdown(),
            const SizedBox(height: 12),

            // Görüşme Kişisi (Öğrenci / Veli)
            _buildDropdown<String>(
              label: 'Görüşme Kişisi',
              value: _selectedMeetingWith,
              items: const [
                DropdownMenuItem(value: 'student', child: Text('Öğrenci')),
                DropdownMenuItem(value: 'parent', child: Text('Veli')),
              ],
              onChanged: (v) => setState(() => _selectedMeetingWith = v!),
            ),
            const SizedBox(height: 12),

            // Görüşme Türü
            _buildDropdown<String>(
              label: 'Kayıt Türü',
              value: _selectedType,
              items: const [
                DropdownMenuItem(value: 'meeting', child: Text('Görüşme')),
                DropdownMenuItem(value: 'appointment', child: Text('Randevu')),
              ],
              onChanged: (v) => setState(() => _selectedType = v!),
            ),
            const SizedBox(height: 12),

            // Görüşme Konusu
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: _selectedType == 'appointment'
                    ? 'Randevu Konusu'
                    : 'Görüşme Konusu *',
                border: const OutlineInputBorder(),
              ),
              validator: (v) {
                if (_selectedType == 'appointment') return null;
                return (v == null || v.trim().isEmpty) ? 'Konu gerekli' : null;
              },
            ),
            const SizedBox(height: 12),

            // Görüşme Notları + Sesle Yazdır
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Görüşme Detayı / Notlar',
                    style: TextStyle(fontSize: 13, color: Colors.black54),
                  ),
                ),
                VoiceInputButton(controller: _contentController),
              ],
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Görüşme hakkında notlar...',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),

            // Tarih ve Saat
            Row(
              children: [
                Expanded(child: _buildDatePicker()),
                const SizedBox(width: 12),
                Expanded(child: _buildTimePicker()),
              ],
            ),
            const SizedBox(height: 16),

            // Görünürlük
            _buildDropdown<String>(
              label: 'Görünürlük / Gizlilik',
              value: _selectedVisibility,
              items: const [
                DropdownMenuItem(
                  value: 'admin_only',
                  child: Text('Sadece Yönetici'),
                ),
                DropdownMenuItem(
                  value: 'teachers_open',
                  child: Text('Öğretmenlere Açık'),
                ),
                DropdownMenuItem(
                  value: 'private',
                  child: Text('Sadece Ben (Özel)'),
                ),
                DropdownMenuItem(
                  value: 'public',
                  child: Text('Herkese Açık'),
                ),
              ],
              onChanged: (v) => setState(() => _selectedVisibility = v!),
            ),
            const SizedBox(height: 24),

            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: _saving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'KAYDET',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentDropdown() {
    return DropdownButtonFormField<int>(
      initialValue: _selectedStudentId,
      decoration: InputDecoration(
        labelText: 'Öğrenci Seçimi *',
        border: const OutlineInputBorder(),
        suffixIcon: _loadingStudents
            ? const SizedBox(
                width: 20,
                height: 20,
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : null,
      ),
      items: [
        if (_students.isEmpty)
          const DropdownMenuItem(value: null, child: Text('Önce sınıf seçin')),
        if (_selectedStudentId != null &&
            !_students.any((s) => s['id'] == _selectedStudentId))
          DropdownMenuItem(
            value: _selectedStudentId,
            child: Text(
              widget.initialRecord?['student']?['name']?.toString() ??
                  'Mevcut Öğrenci',
            ),
          ),
        ..._students.map((e) {
          final name = (e['name'] ?? e['student_name'] ?? '').toString();
          final schoolNo = e['school_no']?.toString() ?? '';
          final label = schoolNo.isNotEmpty ? '$name ($schoolNo)' : name;
          return DropdownMenuItem(
            value: e['id'] as int,
            child: Text(label),
          );
        }),
      ],
      onChanged: (v) => setState(() => _selectedStudentId = v),
      validator: (v) => v == null ? 'Öğrenci gerekli' : null,
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
    String? Function(T?)? validator,
  }) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      items: items,
      onChanged: onChanged,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
    );
  }

  Widget _buildDatePicker() {
    return InkWell(
      onTap: () async {
        final now = DateTime.now();
        final first = DateTime(2020);
        final last = DateTime(now.year + 5);

        DateTime initial = _selectedDate;
        if (initial.isBefore(first)) initial = first;
        if (initial.isAfter(last)) initial = last;

        final picked = await showDatePicker(
          context: context,
          initialDate: initial,
          firstDate: first,
          lastDate: last,
        );
        if (picked != null) setState(() => _selectedDate = picked);
      },
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Tarih',
          border: OutlineInputBorder(),
        ),
        child: Text(
          '${_selectedDate.day.toString().padLeft(2, '0')}.${_selectedDate.month.toString().padLeft(2, '0')}.${_selectedDate.year}',
        ),
      ),
    );
  }

  Widget _buildTimePicker() {
    return InkWell(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: _selectedTime,
        );
        if (picked != null) setState(() => _selectedTime = picked);
      },
      child: InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Saat',
          border: OutlineInputBorder(),
        ),
        child: Text(_selectedTime.format(context)),
      ),
    );
  }
}
